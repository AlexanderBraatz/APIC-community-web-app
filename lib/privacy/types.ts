export type PrivacyPreferences = {
	user_id: string;
	analytics_enabled: boolean;
	session_replay_enabled: boolean;
	preferences_answered_at: string;
	terms_accepted_at: string;
	created_at: string;
	updated_at: string;
};

export type PrivacyPreferenceInput = {
	analyticsEnabled: boolean;
	sessionReplayEnabled: boolean;
};
