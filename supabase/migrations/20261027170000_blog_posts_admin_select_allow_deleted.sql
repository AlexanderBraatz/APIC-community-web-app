-- Soft delete sets status='deleted'. Postgres applies SELECT policies to the
-- new row of an UPDATE (because of WHERE / column refs), so admin SELECT must
-- allow 'deleted' or the UPDATE fails with:
--   new row violates row-level security policy for table "blog_posts"
-- Admin UI/API still hide deleted rows via explicit status filters.

drop policy if exists "Admins can select draft and published blog_posts"
on public.blog_posts;

create policy "Admins can select blog_posts"
on public.blog_posts
for select
to authenticated
using (
	public.is_admin()
	and status in ('draft', 'published', 'deleted')
);
