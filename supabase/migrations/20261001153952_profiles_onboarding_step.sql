-- Invite onboarding progress after privacy (name → colour → favorites → done).
-- null + existing privacy_preferences = legacy members already past onboarding.

alter table public.profiles
	add column onboarding_step text,
	add constraint profiles_onboarding_step_check
		check (
			onboarding_step is null
			or onboarding_step in ('name', 'colour', 'favorites', 'done')
		);

grant update (onboarding_step) on table public.profiles to authenticated;
