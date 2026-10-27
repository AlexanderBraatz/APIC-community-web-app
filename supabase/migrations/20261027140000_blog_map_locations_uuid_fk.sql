-- Stage 7: blog_map_locations.post_id text → uuid FK → blog_posts(id).
-- Prerequisite: golf post migrated and legacy post_id '1' remapped to its UUID
-- (see scripts/migrate-golf-blog-post.mjs). Orphan Tina numeric pins are dropped.

-- Drop map rows that do not reference an existing blog_posts.id (legacy Tina ids).
delete from public.blog_map_locations bml
where not exists (
	select 1
	from public.blog_posts bp
	where bp.id::text = bml.post_id
);

-- Drop text-only length check before casting to uuid (trim(uuid) is invalid).
alter table public.blog_map_locations
	drop constraint if exists blog_map_locations_post_id_length;

-- Convert PK column to uuid and add FK.
alter table public.blog_map_locations
	alter column post_id type uuid using post_id::uuid;

alter table public.blog_map_locations
	add constraint blog_map_locations_post_id_fkey
	foreign key (post_id)
	references public.blog_posts (id)
	on delete cascade;

-- Tighten public SELECT: only maps whose post is published.
-- Admins can still read draft maps for the stepper.
drop policy if exists "Anyone can select blog_map_locations"
on public.blog_map_locations;

create policy "Anyone can select maps for published posts"
on public.blog_map_locations
for select
to anon, authenticated
using (
	exists (
		select 1
		from public.blog_posts bp
		where bp.id = blog_map_locations.post_id
			and bp.status = 'published'
	)
);

create policy "Admins can select all blog_map_locations"
on public.blog_map_locations
for select
to authenticated
using (public.is_admin());
