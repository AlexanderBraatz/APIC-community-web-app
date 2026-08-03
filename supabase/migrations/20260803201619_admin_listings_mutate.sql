-- Admin full mutate on listings + tags (members remain SELECT-only).

create policy "Admins can insert listings"
on public.listings
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update listings"
on public.listings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete listings"
on public.listings
for delete
to authenticated
using (public.is_admin());

create policy "Admins can insert listing_tags"
on public.listing_tags
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update listing_tags"
on public.listing_tags
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete listing_tags"
on public.listing_tags
for delete
to authenticated
using (public.is_admin());

create policy "Admins can insert listing_tag_assignments"
on public.listing_tag_assignments
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can delete listing_tag_assignments"
on public.listing_tag_assignments
for delete
to authenticated
using (public.is_admin());

grant insert, update, delete on table public.listings to authenticated;
grant insert, update, delete on table public.listing_tags to authenticated;
grant insert, delete on table public.listing_tag_assignments to authenticated;
