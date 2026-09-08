-- Shared event bar colour on profiles; private scheduler prefs (font + pins).

alter table public.profiles
	add column event_bar_color text,
	add constraint profiles_event_bar_color_hex_check
		check (
			event_bar_color is null
			or event_bar_color ~ '^#[0-9A-Fa-f]{6}$'
		);

grant update (event_bar_color) on table public.profiles to authenticated;

create table public.scheduler_preferences (
	user_id uuid primary key references public.profiles (id) on delete cascade,
	font_size text not null default 'medium'
		constraint scheduler_preferences_font_size_check
			check (font_size in ('small', 'medium', 'large')),
	pinned_member_ids uuid[] not null default '{}'::uuid[],
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger scheduler_preferences_set_updated_at
before update on public.scheduler_preferences
for each row
execute function public.set_updated_at();

alter table public.scheduler_preferences enable row level security;

create policy "Users can select own scheduler preferences"
on public.scheduler_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own scheduler preferences"
on public.scheduler_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own scheduler preferences"
on public.scheduler_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.scheduler_preferences to authenticated;
