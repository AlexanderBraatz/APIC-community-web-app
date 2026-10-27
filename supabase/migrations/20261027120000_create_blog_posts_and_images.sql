-- Blog posts + slug redirects + blog-images storage (Stage 1).
-- NOTE (Stage 7): Do NOT convert blog_map_locations.post_id to uuid here.
-- Existing Tina post `1` map rows must keep working until content cutover.

create table public.blog_posts (
	id uuid primary key default gen_random_uuid(),
	slug text not null,
	title text not null,
	author text not null,
	published_at timestamptz not null,
	short_description text not null,
	thumbnail_path text,
	body jsonb not null default '{}'::jsonb,
	status text not null default 'draft',
	created_by uuid references public.profiles (id) on delete set null,
	updated_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz,
	constraint blog_posts_slug_unique unique (slug),
	constraint blog_posts_status_check check (
		status in ('draft', 'published', 'deleted')
	),
	constraint blog_posts_slug_length check (
		char_length(trim(slug)) > 0 and char_length(slug) <= 200
	),
	constraint blog_posts_title_length check (
		char_length(trim(title)) > 0 and char_length(title) <= 300
	),
	constraint blog_posts_author_length check (
		char_length(trim(author)) > 0 and char_length(author) <= 200
	),
	constraint blog_posts_short_description_length check (
		char_length(trim(short_description)) > 0
		and char_length(short_description) <= 2000
	),
	constraint blog_posts_thumbnail_path_length check (
		thumbnail_path is null
		or (
			char_length(trim(thumbnail_path)) > 0
			and char_length(thumbnail_path) <= 1000
		)
	)
);

create index blog_posts_status_published_at_idx
on public.blog_posts (status, published_at desc)
where status <> 'deleted';

create trigger blog_posts_set_updated_at
before update on public.blog_posts
for each row
execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

-- Public: published posts only.
create policy "Anyone can select published blog_posts"
on public.blog_posts
for select
to anon, authenticated
using (status = 'published');

-- Admin: drafts + published (soft-deleted stay hidden from admin UI/API).
create policy "Admins can select draft and published blog_posts"
on public.blog_posts
for select
to authenticated
using (
	public.is_admin()
	and status in ('draft', 'published')
);

create policy "Admins can insert blog_posts"
on public.blog_posts
for insert
to authenticated
with check (
	public.is_admin()
	and status in ('draft', 'published')
);

-- Soft delete is an UPDATE to status='deleted' (+ deleted_at in app).
-- USING allows current draft/published rows; WITH CHECK allows transition to deleted.
create policy "Admins can update blog_posts"
on public.blog_posts
for update
to authenticated
using (
	public.is_admin()
	and status in ('draft', 'published')
)
with check (
	public.is_admin()
	and status in ('draft', 'published', 'deleted')
);

-- No DELETE policy: product path is soft delete via UPDATE.

grant select on table public.blog_posts to anon, authenticated;
grant insert, update on table public.blog_posts to authenticated;

create table public.blog_slug_redirects (
	old_slug text primary key,
	post_id uuid not null references public.blog_posts (id) on delete cascade,
	created_at timestamptz not null default now(),
	constraint blog_slug_redirects_old_slug_length check (
		char_length(trim(old_slug)) > 0 and char_length(old_slug) <= 200
	)
);

create index blog_slug_redirects_post_id_idx
on public.blog_slug_redirects (post_id);

alter table public.blog_slug_redirects enable row level security;

create policy "Anyone can select blog_slug_redirects"
on public.blog_slug_redirects
for select
to anon, authenticated
using (true);

create policy "Admins can insert blog_slug_redirects"
on public.blog_slug_redirects
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update blog_slug_redirects"
on public.blog_slug_redirects
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete blog_slug_redirects"
on public.blog_slug_redirects
for delete
to authenticated
using (public.is_admin());

grant select on table public.blog_slug_redirects to anon, authenticated;
grant insert, update, delete on table public.blog_slug_redirects to authenticated;

-- Public bucket for next/image / CDN-style public URLs.
-- Paths: {post_id}/thumbnail|body/...
-- Unlike avatars (owner-scoped SELECT to avoid path listing), blog images are
-- intentionally publicly readable via storage API + public object URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'blog-images',
	'blog-images',
	true,
	10485760, -- 10 MiB
	array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can select blog-images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'blog-images');

-- Upsert needs SELECT (above) + INSERT + UPDATE.
create policy "Admins can insert blog-images"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'blog-images'
	and public.is_admin()
);

create policy "Admins can update blog-images"
on storage.objects
for update
to authenticated
using (
	bucket_id = 'blog-images'
	and public.is_admin()
)
with check (
	bucket_id = 'blog-images'
	and public.is_admin()
);

create policy "Admins can delete blog-images"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'blog-images'
	and public.is_admin()
);
