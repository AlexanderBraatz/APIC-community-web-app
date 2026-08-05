-- Track Google Places batch enrichment progress per listing.

create type public.places_enrichment_status as enum (
	'pending',
	'updated',
	'not_found',
	'error'
);

alter table public.listings
	add column places_enrichment_status public.places_enrichment_status
		not null default 'pending',
	add column places_enrichment_notes text;

create index listings_places_enrichment_status_idx
	on public.listings (places_enrichment_status);
