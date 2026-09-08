'use server';

import { createClient } from '@/lib/supabase/server';
import type {
	AttendanceRow,
	AttendanceStayInput,
	ProfileResource,
	SchedulerFontSize,
	SchedulerPreferences
} from './types';

function isSchedulerFontSize(value: string): value is SchedulerFontSize {
	return value === 'small' || value === 'medium' || value === 'large';
}

export async function loadSchedulerData(): Promise<{
	profiles: ProfileResource[];
	attendance: AttendanceRow[];
	preferences: SchedulerPreferences;
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

	const [
		{ data: profile, error: profileError },
		{ data: profiles, error: profilesError },
		{ data: attendance, error: attendanceError },
		{ data: prefs, error: prefsError }
	] = await Promise.all([
		supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle(),
		supabase
			.from('profiles')
			.select('id, full_name, avatar_url, event_bar_color')
			.order('full_name', { ascending: true }),
		supabase
			.from('attendance')
			.select('id, user_id, title, note, start_date, end_date')
			.gte('end_date', new Date().toISOString().slice(0, 10))
			.order('start_date', { ascending: true }),
		supabase
			.from('scheduler_preferences')
			.select('font_size, pinned_member_ids')
			.eq('user_id', user.id)
			.maybeSingle()
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
	if (prefsError) {
		throw new Error(prefsError.message);
	}

	const fontSize =
		prefs?.font_size && isSchedulerFontSize(prefs.font_size)
			? prefs.font_size
			: 'medium';

	return {
		profiles: (profiles ?? []) as ProfileResource[],
		attendance: (attendance ?? []) as AttendanceRow[],
		preferences: {
			fontSize,
			pinnedMemberIds: prefs?.pinned_member_ids ?? []
		},
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
