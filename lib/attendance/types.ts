export type ProfileResource = {
	id: string;
	full_name: string;
	avatar_url: string | null;
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
