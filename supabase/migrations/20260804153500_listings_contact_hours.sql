-- Split free-text contact into phone/email/website; add structured opening_hours;
-- rename remark -> notes. Keeps contact until data backfill completes.

alter table public.listings
	add column phone text,
	add column email text,
	add column website text,
	add column opening_hours jsonb;

alter table public.listings
	rename column remark to notes;

alter table public.listings
	add constraint listings_opening_hours_object check (
		opening_hours is null or jsonb_typeof(opening_hours) = 'object'
	);
