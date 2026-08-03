-- Listings schema for member browse/search/map (read path).
-- Writes stay service-role / admin for now (PR-06).
-- O1: authenticated SELECT only (public UI shows sign-in CTA).

create type public.listing_category as enum (
	'food-dining',
	'services-maintenance',
	'health-wellness',
	'shop-market'
);

create table public.listings (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	type text,
	address text,
	contact text,
	remark text,
	category public.listing_category not null,
	source_url text,
	latitude double precision,
	longitude double precision,
	created_by uuid references public.profiles (id) on delete set null,
	updated_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint listings_name_length check (char_length(name) <= 300),
	constraint listings_latitude_range check (
		latitude is null or (latitude >= -90 and latitude <= 90)
	),
	constraint listings_longitude_range check (
		longitude is null or (longitude >= -180 and longitude <= 180)
	),
	constraint listings_coords_pair check (
		(latitude is null) = (longitude is null)
	)
);

create unique index listings_category_name_unique
on public.listings (category, lower(name));

create index listings_category_idx on public.listings (category);
create index listings_name_idx on public.listings (name);

create trigger listings_set_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();

create table public.listing_tags (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	constraint listing_tags_name_length check (
		char_length(trim(name)) > 0 and char_length(name) <= 100
	)
);

create unique index listing_tags_name_lower_unique
on public.listing_tags (lower(trim(name)));

create table public.listing_tag_assignments (
	listing_id uuid not null references public.listings (id) on delete cascade,
	tag_id uuid not null references public.listing_tags (id) on delete cascade,
	primary key (listing_id, tag_id)
);

create index listing_tag_assignments_tag_id_idx
on public.listing_tag_assignments (tag_id);

alter table public.listings enable row level security;
alter table public.listing_tags enable row level security;
alter table public.listing_tag_assignments enable row level security;

create policy "Authenticated users can select listings"
on public.listings
for select
to authenticated
using (true);

create policy "Authenticated users can select listing_tags"
on public.listing_tags
for select
to authenticated
using (true);

create policy "Authenticated users can select listing_tag_assignments"
on public.listing_tag_assignments
for select
to authenticated
using (true);

grant select on table public.listings to authenticated;
grant select on table public.listing_tags to authenticated;
grant select on table public.listing_tag_assignments to authenticated;
