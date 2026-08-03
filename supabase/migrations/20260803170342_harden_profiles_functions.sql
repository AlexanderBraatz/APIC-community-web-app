-- Harden profile helper functions (search_path + revoke RPC on trigger fn)

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
