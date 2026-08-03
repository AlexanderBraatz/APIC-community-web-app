-- Admin user role changes + allow deleting users who left audit/invite history.

-- Keep audit rows when the acting admin's profile is later deleted.
alter table public.admin_audit_log
	alter column admin_user_id drop not null;

alter table public.admin_audit_log
	drop constraint if exists admin_audit_log_admin_user_id_fkey;

alter table public.admin_audit_log
	add constraint admin_audit_log_admin_user_id_fkey
	foreign key (admin_user_id)
	references public.profiles (id)
	on delete set null;

-- Promote / demote with final-admin + no self-role-change guards.
create or replace function public.change_user_role(
	p_user_id uuid,
	p_new_role public.user_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
	actor uuid := (select auth.uid());
	target public.profiles;
	admin_count integer;
begin
	if actor is null or not public.is_admin() then
		raise exception 'Admin only';
	end if;

	if p_user_id is null then
		raise exception 'User id is required';
	end if;

	if p_user_id = actor then
		raise exception 'You cannot change your own role';
	end if;

	select * into target
	from public.profiles
	where id = p_user_id
	for update;

	if not found then
		raise exception 'User not found';
	end if;

	if target.role = p_new_role then
		return target;
	end if;

	if target.role = 'admin' and p_new_role = 'user' then
		select count(*)::integer into admin_count
		from public.profiles
		where role = 'admin';

		if admin_count <= 1 then
			raise exception 'Cannot demote the last remaining admin';
		end if;
	end if;

	update public.profiles
	set role = p_new_role
	where id = p_user_id
	returning * into target;

	return target;
end;
$$;

revoke all on function public.change_user_role(uuid, public.user_role) from public;
revoke execute on function public.change_user_role(uuid, public.user_role) from anon;
grant execute on function public.change_user_role(uuid, public.user_role) to authenticated;
