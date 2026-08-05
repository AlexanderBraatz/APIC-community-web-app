-- Replace scalar phone/email/website with a structured contacts jsonb array.

alter table public.listings
	add column contacts jsonb not null default '[]'::jsonb;

alter table public.listings
	add constraint listings_contacts_array check (
		jsonb_typeof(contacts) = 'array'
	);

update public.listings
set contacts =
	coalesce(
		case
			when phone is not null and btrim(phone) <> '' then
				jsonb_build_array(
					jsonb_build_object('kind', 'phone', 'value', btrim(phone))
				)
			else '[]'::jsonb
		end,
		'[]'::jsonb
	)
	|| coalesce(
		case
			when email is not null and btrim(email) <> '' then
				jsonb_build_array(
					jsonb_build_object('kind', 'email', 'value', btrim(email))
				)
			else '[]'::jsonb
		end,
		'[]'::jsonb
	)
	|| coalesce(
		case
			when website is not null and btrim(website) <> '' then
				jsonb_build_array(
					jsonb_build_object('kind', 'website', 'value', btrim(website))
				)
			else '[]'::jsonb
		end,
		'[]'::jsonb
	);

alter table public.listings
	drop column phone,
	drop column email,
	drop column website;
