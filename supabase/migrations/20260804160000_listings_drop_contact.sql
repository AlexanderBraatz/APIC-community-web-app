-- Drop free-text contact after phone/email/website backfill.

alter table public.listings
	drop column if exists contact;
