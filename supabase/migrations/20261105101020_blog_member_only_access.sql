-- Member-only blog reads. Published rows stay visible to signed-in members.
-- Drafts stay on the existing admin policies. Anon keeps no privileges on these
-- tables. The blog-images bucket is private; members read files through the app.

drop policy if exists "Anyone can select published blog_posts"
on public.blog_posts;

create policy "Authenticated users can select published blog_posts"
on public.blog_posts
for select
to authenticated
using (status = 'published');

drop policy if exists "Anyone can select maps for published posts"
on public.blog_map_locations;

create policy "Authenticated users can select maps for published posts"
on public.blog_map_locations
for select
to authenticated
using (
	exists (
		select 1
		from public.blog_posts bp
		where bp.id = blog_map_locations.post_id
			and bp.status = 'published'
	)
);

drop policy if exists "Anyone can select blog_slug_redirects"
on public.blog_slug_redirects;

create policy "Authenticated users can select blog_slug_redirects"
on public.blog_slug_redirects
for select
to authenticated
using (
	(select public.is_admin())
	or exists (
		select 1
		from public.blog_posts bp
		where bp.id = blog_slug_redirects.post_id
			and bp.status = 'published'
	)
);

drop policy if exists "Anyone can select blog_thumbnail_assets"
on public.blog_thumbnail_assets;

create policy "Authenticated users can select blog_thumbnail_assets"
on public.blog_thumbnail_assets
for select
to authenticated
using (
	(select public.is_admin())
	or exists (
		select 1
		from public.blog_posts bp
		where bp.status = 'published'
			and (
				bp.thumbnail_asset_id = blog_thumbnail_assets.id
				or bp.thumbnail_path = blog_thumbnail_assets.storage_path
			)
	)
);

revoke all on table public.blog_posts from anon;
revoke all on table public.blog_map_locations from anon;
revoke all on table public.blog_slug_redirects from anon;
revoke all on table public.blog_thumbnail_assets from anon;

update storage.buckets
set public = false
where id = 'blog-images';

drop policy if exists "Anyone can select blog-images"
on storage.objects;

create policy "Authenticated users can select blog-images"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'blog-images'
	and (
		(select public.is_admin())
		or exists (
			select 1
			from public.blog_posts bp
			where bp.status = 'published'
				and (
					starts_with(storage.objects.name, bp.id::text || '/')
					or storage.objects.name = bp.thumbnail_path
					or exists (
						select 1
						from public.blog_thumbnail_assets asset
						where asset.id = bp.thumbnail_asset_id
							and asset.storage_path = storage.objects.name
					)
				)
		)
	)
);

-- One-shot rewrite of TipTap image nodes that still store a public object URL.
-- Dropped at the end of this migration.
create function public.rewrite_blog_public_image_urls(node jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
	result jsonb := '{}'::jsonb;
	key text;
	child jsonb;
	src text;
	storage_path text;
	marker constant text := '/storage/v1/object/public/blog-images/';
	marker_at integer;
begin
	if node is null or jsonb_typeof(node) = 'null' then
		return node;
	end if;

	if jsonb_typeof(node) = 'array' then
		result := '[]'::jsonb;
		for child in
			select value
			from jsonb_array_elements(node)
		loop
			result := result || jsonb_build_array(
				public.rewrite_blog_public_image_urls(child)
			);
		end loop;
		return result;
	end if;

	if jsonb_typeof(node) <> 'object' then
		return node;
	end if;

	if node->>'type' = 'image' then
		src := node #>> '{attrs,src}';
		if src is not null then
			marker_at := position(marker in src);
			if marker_at > 0 then
				storage_path := substring(src from marker_at + char_length(marker));
				storage_path := split_part(split_part(storage_path, '?', 1), '#', 1);
				if storage_path <> '' then
					node := jsonb_set(node, '{attrs,path}', to_jsonb(storage_path), true);
					node := jsonb_set(
						node,
						'{attrs,src}',
						to_jsonb('/blog/images/' || storage_path),
						true
					);
				end if;
			end if;
		end if;
	end if;

	for key, child in
		select entry.key, entry.value
		from jsonb_each(node) as entry
	loop
		result := result || jsonb_build_object(
			key,
			public.rewrite_blog_public_image_urls(child)
		);
	end loop;

	return result;
end;
$$;

alter table public.blog_posts disable trigger blog_posts_set_updated_at;

update public.blog_posts
set body = public.rewrite_blog_public_image_urls(body)
where body::text like '%/storage/v1/object/public/blog-images/%';

alter table public.blog_posts enable trigger blog_posts_set_updated_at;

revoke all on function public.rewrite_blog_public_image_urls(jsonb) from public;
drop function public.rewrite_blog_public_image_urls(jsonb);
