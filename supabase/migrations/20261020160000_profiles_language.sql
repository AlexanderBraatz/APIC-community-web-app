-- Manual language preference (en/de/it) and language invite onboarding step.
-- Flow: privacy → language → name → colour → attendance → favorites → done.

alter table public.profiles
	add column language text not null default 'en',
	add constraint profiles_language_check
		check (language in ('en', 'de', 'it'));

grant update (language) on table public.profiles to authenticated;

alter table public.profiles
	drop constraint if exists profiles_onboarding_step_check;

alter table public.profiles
	add constraint profiles_onboarding_step_check
		check (
			onboarding_step is null
			or onboarding_step in (
				'language',
				'name',
				'colour',
				'attendance',
				'favorites',
				'done'
			)
		);
