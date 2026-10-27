-- Shared featured-image assets: one storage object per unique SHA-256,
-- posts reference via thumbnail_asset_id. thumbnail_path stays denormalized.

create table public.blog_thumbnail_assets (
	id uuid primary key default gen_random_uuid(),
	storage_path text not null,
	content_sha256 text not null,
	created_at timestamptz not null default now(),
	last_used_at timestamptz not null default now(),
	constraint blog_thumbnail_assets_storage_path_unique unique (storage_path),
	constraint blog_thumbnail_assets_content_sha256_unique unique (content_sha256),
	constraint blog_thumbnail_assets_storage_path_length check (
		char_length(trim(storage_path)) > 0
		and char_length(storage_path) <= 1000
	),
	constraint blog_thumbnail_assets_content_sha256_format check (
		content_sha256 ~ '^[0-9a-f]{64}$'
	)
);

create index blog_thumbnail_assets_last_used_at_idx
on public.blog_thumbnail_assets (last_used_at desc);

alter table public.blog_thumbnail_assets enable row level security;

-- Public URLs already expose these objects; catalog SELECT is fine.
create policy "Anyone can select blog_thumbnail_assets"
on public.blog_thumbnail_assets
for select
to anon, authenticated
using (true);

create policy "Admins can insert blog_thumbnail_assets"
on public.blog_thumbnail_assets
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update blog_thumbnail_assets"
on public.blog_thumbnail_assets
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete blog_thumbnail_assets"
on public.blog_thumbnail_assets
for delete
to authenticated
using (public.is_admin());

grant select on table public.blog_thumbnail_assets to anon, authenticated;
grant insert, update, delete on table public.blog_thumbnail_assets to authenticated;

alter table public.blog_posts
add column thumbnail_asset_id uuid
references public.blog_thumbnail_assets (id)
on delete set null;

create index blog_posts_thumbnail_asset_id_idx
on public.blog_posts (thumbnail_asset_id)
where thumbnail_asset_id is not null;
