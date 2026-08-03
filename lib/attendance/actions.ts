'use server';

import { createClient } from '@/lib/supabase/server';
import type { AttendanceRow, AttendanceStayInput, ProfileResource } from './types';

export async function loadSchedulerData(): Promise<{
	profiles: ProfileResource[];
	attendance: AttendanceRow[];
	currentUserId: string;
	isAdmin: boolean;
}> {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error('Not authenticated');
	}

	const [{ data: profile, error: profileError }, { data: profiles, error: profilesError }, { data: attendance, error: attendanceError }] =
		await Promise.all([
			supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle(),
			supabase
				.from('profiles')
				.select('id, full_name, avatar_url')
				.order('full_name', { ascending: true }),
			supabase
				.from('attendance')
				.select('id, user_id, title, note, start_date, end_date')
				.gte('end_date', new Date().toISOString().slice(0, 10))
				.order('start_date', { ascending: true })
		]);

	if (profileError) {
		throw new Error(profileError.message);
	}
	if (profilesError) {
		throw new Error(profilesError.message);
	}
	if (attendanceError) {
		throw new Error(attendanceError.message);
	}

	return {
		profiles: (profiles ?? []) as ProfileResource[],
		attendance: (attendance ?? []) as AttendanceRow[],
		currentUserId: user.id,
		isAdmin: profile?.role === 'admin'
	};
}

export async function saveAttendanceBatch(payload: {
	stays: AttendanceStayInput[];
	deleteIds: string[];
}): Promise<AttendanceRow[]> {
	const supabase = await createClient();
	const { data, error } = await supabase.rpc('save_attendance_batch', {
		p_stays: payload.stays,
		p_delete_ids: payload.deleteIds
	});

	if (error) {
		throw new Error(error.message);
	}

	return (data ?? []) as AttendanceRow[];
}
