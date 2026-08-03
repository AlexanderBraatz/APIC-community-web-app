-- Trigram indexes for optional server-side fuzzy listing/tag search.
-- Client-side search remains the v1 default; these support future DB filters.
-- Operator classes live in the `extensions` schema on hosted Supabase.

create extension if not exists pg_trgm with schema extensions;

create index if not exists listings_name_trgm_idx
	on public.listings
	using gin (name extensions.gin_trgm_ops);

create index if not exists listings_type_trgm_idx
	on public.listings
	using gin (type extensions.gin_trgm_ops);

create index if not exists listing_tags_name_trgm_idx
	on public.listing_tags
	using gin (name extensions.gin_trgm_ops);
