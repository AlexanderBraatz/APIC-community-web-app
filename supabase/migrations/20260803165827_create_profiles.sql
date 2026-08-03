-- profiles table, auth trigger, and RLS for member accounts

create type public.user_role as enum ('user', 'admin');

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	full_name text not null default '',
	avatar_url text,
	role public.user_role not null default 'user',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint profiles_full_name_length check (char_length(full_name) <= 200)
);

create index profiles_role_idx on public.profiles (role);
create index profiles_full_name_idx on public.profiles (full_name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Create a profile row for every new Auth user (default role: user).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	derived_name text;
begin
	derived_name := coalesce(
		nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
		nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
		'Member'
	);

	insert into public.profiles (id, full_name, role)
	values (new.id, derived_name, 'user');

	return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- Authenticated members may read basic profile fields for the calendar.
create policy "Authenticated users can select profiles"
on public.profiles
for select
to authenticated
using (true);

-- Members may update only their own name/avatar columns (role is not granted).
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url, updated_at) on table public.profiles to authenticated;
