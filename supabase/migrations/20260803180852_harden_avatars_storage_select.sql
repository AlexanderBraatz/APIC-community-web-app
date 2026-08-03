-- Public buckets do not need a bucket-wide SELECT policy for CDN URLs.
-- Broad SELECT enables listing all avatar paths; keep SELECT owner-scoped for upsert.
-- Idempotent: safe after either the original broad policy or the corrected owner policy.

drop policy if exists "Authenticated users can select avatars" on storage.objects;
drop policy if exists "Users can select own avatar" on storage.objects;

create policy "Users can select own avatar"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'avatars'
	and (storage.foldername(name))[1] = (select auth.uid()::text)
);
