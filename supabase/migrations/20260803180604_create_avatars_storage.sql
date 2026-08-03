-- Avatars bucket: public object URLs (opaque user-id paths) for <img> tags.
-- Who may *discover* avatar_url is gated by profiles RLS (authenticated select).
-- Writes are owner-only under {auth.uid()}/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'avatars',
	'avatars',
	true,
	2097152, -- 2 MiB
	array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

-- Owner-scoped SELECT (upsert needs SELECT + UPDATE; public CDN URLs do not need bucket listing).
create policy "Users can select own avatar"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'avatars'
	and (storage.foldername(name))[1] = (select auth.uid()::text)
);
-- Owner folder only: {user_id}/filename
create policy "Users can insert own avatar"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'avatars'
	and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Upsert requires SELECT (above) + UPDATE.
create policy "Users can update own avatar"
on storage.objects
for update
to authenticated
using (
	bucket_id = 'avatars'
	and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
	bucket_id = 'avatars'
	and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete own avatar"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'avatars'
	and (storage.foldername(name))[1] = (select auth.uid()::text)
);
