-- Attendance (member stays) + batch save RPC

create table public.attendance (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	title text not null,
	note text,
	start_date date not null,
	end_date date not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint attendance_title_length check (char_length(title) <= 200),
	constraint attendance_date_range check (start_date <= end_date)
);

create index attendance_user_id_idx on public.attendance (user_id);
create index attendance_start_date_idx on public.attendance (start_date);
create index attendance_end_date_idx on public.attendance (end_date);
create index attendance_date_range_idx on public.attendance (start_date, end_date);

create trigger attendance_set_updated_at
before update on public.attendance
for each row
execute function public.set_updated_at();

alter table public.attendance enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
	select exists (
		select 1
		from public.profiles p
		where p.id = (select auth.uid())
			and p.role = 'admin'
	);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Authenticated users can select attendance"
on public.attendance
for select
to authenticated
using (true);

create policy "Users can insert own attendance"
on public.attendance
for insert
to authenticated
with check (
	(select auth.uid()) = user_id
	or public.is_admin()
);

create policy "Users can update own attendance"
on public.attendance
for update
to authenticated
using (
	(select auth.uid()) = user_id
	or public.is_admin()
)
with check (
	(select auth.uid()) = user_id
	or public.is_admin()
);

create policy "Users can delete own attendance"
on public.attendance
for delete
to authenticated
using (
	(select auth.uid()) = user_id
	or public.is_admin()
);

grant select, insert, update, delete on table public.attendance to authenticated;

-- Atomic batch save mirroring the scheduler draft→commit model.
-- p_stays: jsonb array of {id?, user_id, title, note, start_date, end_date}
-- p_delete_ids: uuids to remove (soft-deletes + loaded rows dropped from the owned set)
create or replace function public.save_attendance_batch(
	p_stays jsonb,
	p_delete_ids uuid[] default '{}'::uuid[]
)
returns setof public.attendance
language plpgsql
security invoker
set search_path = ''
as $$
declare
	uid uuid := (select auth.uid());
	is_admin boolean := public.is_admin();
	stay jsonb;
	stay_id uuid;
	stay_user uuid;
	stay_title text;
	stay_note text;
	stay_start date;
	stay_end date;
begin
	if uid is null then
		raise exception 'Not authenticated';
	end if;

	if p_delete_ids is not null and array_length(p_delete_ids, 1) is not null then
		delete from public.attendance a
		where a.id = any (p_delete_ids)
			and (is_admin or a.user_id = uid);
	end if;

	if p_stays is null or jsonb_typeof(p_stays) <> 'array' then
		raise exception 'p_stays must be a JSON array';
	end if;

	for stay in select value from jsonb_array_elements(p_stays)
	loop
		stay_id := nullif(stay ->> 'id', '')::uuid;
		stay_user := nullif(stay ->> 'user_id', '')::uuid;
		stay_title := nullif(trim(coalesce(stay ->> 'title', '')), '');
		stay_note := nullif(trim(coalesce(stay ->> 'note', '')), '');
		stay_start := nullif(stay ->> 'start_date', '')::date;
		stay_end := nullif(stay ->> 'end_date', '')::date;

		if stay_user is null or stay_title is null or stay_start is null or stay_end is null then
			raise exception 'Each stay requires user_id, title, start_date, and end_date';
		end if;

		if stay_start > stay_end then
			raise exception 'start_date must be on or before end_date';
		end if;

		if not is_admin and stay_user <> uid then
			raise exception 'Cannot save attendance for another user';
		end if;

		if stay_id is null then
			insert into public.attendance (user_id, title, note, start_date, end_date)
			values (stay_user, stay_title, stay_note, stay_start, stay_end);
		else
			insert into public.attendance (id, user_id, title, note, start_date, end_date)
			values (stay_id, stay_user, stay_title, stay_note, stay_start, stay_end)
			on conflict (id) do update
			set
				user_id = excluded.user_id,
				title = excluded.title,
				note = excluded.note,
				start_date = excluded.start_date,
				end_date = excluded.end_date
			where
				public.attendance.user_id = uid
				or is_admin;
		end if;
	end loop;

	return query
	select a.*
	from public.attendance a
	where a.end_date >= (select current_date)
	order by a.start_date, a.user_id;
end;
$$;

revoke all on function public.save_attendance_batch(jsonb, uuid[]) from public;
grant execute on function public.save_attendance_batch(jsonb, uuid[]) to authenticated;
