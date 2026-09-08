export type ProfileResource = {
	id: string;
	full_name: string;
	avatar_url: string | null;
	event_bar_color: string | null;
};

export type SchedulerFontSize = 'small' | 'medium' | 'large';

export type SchedulerPreferences = {
	fontSize: SchedulerFontSize;
	pinnedMemberIds: string[];
};

export type AttendanceRow = {
	id: string;
	user_id: string;
	title: string;
	note: string | null;
	start_date: string;
	end_date: string;
};

export type AttendanceStayInput = {
	id: string;
	user_id: string;
	title: string;
	note: string | null;
	start_date: string;
	end_date: string;
};
