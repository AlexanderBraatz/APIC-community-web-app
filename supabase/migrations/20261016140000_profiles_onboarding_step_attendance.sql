-- Allow attendance step in invite onboarding
-- (name → colour → attendance → favorites → done).

alter table public.profiles
	drop constraint if exists profiles_onboarding_step_check;

alter table public.profiles
	add constraint profiles_onboarding_step_check
		check (
			onboarding_step is null
			or onboarding_step in (
				'name',
				'colour',
				'attendance',
				'favorites',
				'done'
			)
		);
