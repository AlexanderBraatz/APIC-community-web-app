-- Invitations + admin audit log

create type public.invitation_status as enum (
	'pending',
	'accepted',
	'expired',
	'cancelled'
);

create table public.user_invitations (
	id uuid primary key default gen_random_uuid(),
	email text not null,
	invited_by uuid not null references public.profiles (id) on delete restrict,
	status public.invitation_status not null default 'pending',
	invited_at timestamptz not null default now(),
	accepted_at timestamptz,
	cancelled_at timestamptz,
	expires_at timestamptz,
	last_sent_at timestamptz not null default now(),
	auth_user_id uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint user_invitations_email_format check (position('@' in email) > 1)
);

create index user_invitations_status_idx on public.user_invitations (status);
create index user_invitations_email_idx on public.user_invitations (lower(email));
create index user_invitations_invited_at_idx on public.user_invitations (invited_at desc);

create unique index user_invitations_one_pending_email_uidx
on public.user_invitations (lower(trim(email)))
where status = 'pending';

create trigger user_invitations_set_updated_at
before update on public.user_invitations
for each row
execute function public.set_updated_at();

alter table public.user_invitations enable row level security;

create policy "Admins can select invitations"
on public.user_invitations
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert invitations"
on public.user_invitations
for insert
to authenticated
with check (public.is_admin() and invited_by = (select auth.uid()));

create policy "Admins can update invitations"
on public.user_invitations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on table public.user_invitations to authenticated;

create table public.admin_audit_log (
	id uuid primary key default gen_random_uuid(),
	admin_user_id uuid not null references public.profiles (id) on delete restrict,
	action text not null,
	target_type text not null,
	target_id text,
	summary text not null,
	old_values jsonb,
	new_values jsonb,
	created_at timestamptz not null default now(),
	ip_address inet,
	user_agent text
);

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_admin_user_id_idx on public.admin_audit_log (admin_user_id);
create index admin_audit_log_action_idx on public.admin_audit_log (action);
create index admin_audit_log_target_type_idx on public.admin_audit_log (target_type);

alter table public.admin_audit_log enable row level security;

create policy "Admins can select audit log"
on public.admin_audit_log
for select
to authenticated
using (public.is_admin());

-- No direct client inserts: use write_admin_audit()
grant select on table public.admin_audit_log to authenticated;

create or replace function public.write_admin_audit(
	p_action text,
	p_target_type text,
	p_target_id text,
	p_summary text,
	p_old_values jsonb default null,
	p_new_values jsonb default null
)
returns public.admin_audit_log
language plpgsql
security definer
set search_path = ''
as $$
declare
	uid uuid := (select auth.uid());
	row public.admin_audit_log;
begin
	if uid is null or not public.is_admin() then
		raise exception 'Admin only';
	end if;

	insert into public.admin_audit_log (
		admin_user_id,
		action,
		target_type,
		target_id,
		summary,
		old_values,
		new_values
	)
	values (
		uid,
		p_action,
		p_target_type,
		p_target_id,
		p_summary,
		p_old_values,
		p_new_values
	)
	returning * into row;

	return row;
end;
$$;

revoke all on function public.write_admin_audit(text, text, text, text, jsonb, jsonb) from public;
revoke execute on function public.write_admin_audit(text, text, text, text, jsonb, jsonb) from anon;
grant execute on function public.write_admin_audit(text, text, text, text, jsonb, jsonb) to authenticated;
