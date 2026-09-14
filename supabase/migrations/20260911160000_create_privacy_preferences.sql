-- Optional analytics / session-replay preferences (own-row only).
-- Separate from profiles so calendar profile selects never leak consent.

create table public.privacy_preferences (
	user_id uuid primary key references public.profiles (id) on delete cascade,
	analytics_enabled boolean not null default false,
	session_replay_enabled boolean not null default false,
	preferences_answered_at timestamptz not null default now(),
	terms_accepted_at timestamptz not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger privacy_preferences_set_updated_at
before update on public.privacy_preferences
for each row
execute function public.set_updated_at();

alter table public.privacy_preferences enable row level security;

create policy "Users can select own privacy preferences"
on public.privacy_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own privacy preferences"
on public.privacy_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own privacy preferences"
on public.privacy_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.privacy_preferences to authenticated;
