-- Blog map locations: one row per Tina blog postId (public read, admin write).

create table public.blog_map_locations (
	post_id text primary key,
	address text,
	source_url text,
	latitude double precision not null,
	longitude double precision not null,
	created_by uuid references public.profiles (id) on delete set null,
	updated_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint blog_map_locations_post_id_length check (
		char_length(trim(post_id)) > 0 and char_length(post_id) <= 64
	),
	constraint blog_map_locations_latitude_range check (
		latitude >= -90 and latitude <= 90
	),
	constraint blog_map_locations_longitude_range check (
		longitude >= -180 and longitude <= 180
	)
);

create trigger blog_map_locations_set_updated_at
before update on public.blog_map_locations
for each row
execute function public.set_updated_at();

alter table public.blog_map_locations enable row level security;

create policy "Anyone can select blog_map_locations"
on public.blog_map_locations
for select
to anon, authenticated
using (true);

create policy "Admins can insert blog_map_locations"
on public.blog_map_locations
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update blog_map_locations"
on public.blog_map_locations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete blog_map_locations"
on public.blog_map_locations
for delete
to authenticated
using (public.is_admin());

grant select on table public.blog_map_locations to anon, authenticated;
grant insert, update, delete on table public.blog_map_locations to authenticated;
