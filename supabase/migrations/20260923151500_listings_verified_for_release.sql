-- Temporary admin review flag for manually sorting recommendations before release.
-- Does not affect member-facing visibility.

alter table public.listings
	add column verified_for_release boolean not null default false;
