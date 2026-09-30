-- Snapshot of listings tables before bulk recommendation edits.
-- Restore path: truncate live tables and copy back from these backups.

create table public.listings_backup_20260930 as
table public.listings;

create table public.listing_tags_backup_20260930 as
table public.listing_tags;

create table public.listing_tag_assignments_backup_20260930 as
table public.listing_tag_assignments;

revoke all on table public.listings_backup_20260930 from anon, authenticated;
revoke all on table public.listing_tags_backup_20260930 from anon, authenticated;
revoke all on table public.listing_tag_assignments_backup_20260930 from anon, authenticated;
