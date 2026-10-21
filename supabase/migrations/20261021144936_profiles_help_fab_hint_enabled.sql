-- Permanent opt-out for the help FAB coach mark (account setting).

alter table public.profiles
	add column help_fab_hint_enabled boolean not null default true;

grant update (help_fab_hint_enabled) on table public.profiles to authenticated;
