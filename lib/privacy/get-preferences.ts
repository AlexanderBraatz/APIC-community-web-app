import { createClient } from '@/lib/supabase/server';
import type { PrivacyPreferences } from './types';

export async function getPrivacyPreferencesForCurrentUser(): Promise<PrivacyPreferences | null> {
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) return null;

	const { data, error } = await supabase
		.from('privacy_preferences')
		.select(
			'user_id, analytics_enabled, session_replay_enabled, preferences_answered_at, terms_accepted_at, created_at, updated_at'
		)
		.eq('user_id', user.id)
		.maybeSingle();

	if (error) {
		console.error('Failed to load privacy preferences', error.message);
		return null;
	}

	return data as PrivacyPreferences | null;
}

export async function hasCompletedPrivacyOnboarding(
	userId: string
): Promise<boolean> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('privacy_preferences')
		.select('user_id')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		console.error('Failed to check privacy preferences', error.message);
		return false;
	}

	return Boolean(data);
}
