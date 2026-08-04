-- Snapshot of listings tables before contact/hours schema split.
-- Restore path: truncate live tables and copy back from these backups.

create table public.listings_backup_20260804 as
table public.listings;

create table public.listing_tags_backup_20260804 as
table public.listing_tags;

create table public.listing_tag_assignments_backup_20260804 as
table public.listing_tag_assignments;

revoke all on table public.listings_backup_20260804 from anon, authenticated;
revoke all on table public.listing_tags_backup_20260804 from anon, authenticated;
revoke all on table public.listing_tag_assignments_backup_20260804 from anon, authenticated;
