-- Move invite language step after favorites.
-- Resume anyone stuck on the old post-privacy language step at name instead
-- (those users have not set a shown name yet). Do not touch users already on
-- the new post-favorites language step.

-- Flow: privacy → name → colour → attendance → favorites → language → done.

update public.profiles
set onboarding_step = 'name'
where onboarding_step = 'language'
	and coalesce(nullif(btrim(full_name), ''), '') = '';
