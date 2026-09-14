'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function parseBool(value: FormDataEntryValue | null): boolean {
	return value === 'true' || value === 'on' || value === '1';
}

async function requireUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error || !user) {
		redirect('/sign-in');
	}

	return { supabase, user };
}

/**
 * First-time invite privacy step: requires Terms acceptance, then stores
 * optional analytics / session-replay preferences.
 */
export async function saveInvitePrivacyChoices(formData: FormData) {
	const termsAccepted = parseBool(formData.get('terms_accepted'));
	if (!termsAccepted) {
		redirect(
			`/accept-invite?step=privacy&error=${encodeURIComponent(
				'You must accept the Terms & Conditions to join.'
			)}`
		);
	}

	const choice = String(formData.get('choice') ?? '');
	let analyticsEnabled = false;
	let sessionReplayEnabled = false;

	if (choice === 'accept') {
		analyticsEnabled = true;
		sessionReplayEnabled = true;
	} else if (choice === 'decline') {
		analyticsEnabled = false;
		sessionReplayEnabled = false;
	} else if (choice === 'manage') {
		analyticsEnabled = parseBool(formData.get('analytics_enabled'));
		sessionReplayEnabled = parseBool(formData.get('session_replay_enabled'));
	} else {
		redirect(
			`/accept-invite?step=privacy&error=${encodeURIComponent(
				'Choose Accept, Decline, or Manage preferences.'
			)}`
		);
	}

	const { supabase, user } = await requireUser();
	const now = new Date().toISOString();

	const { error } = await supabase.from('privacy_preferences').upsert(
		{
			user_id: user.id,
			analytics_enabled: analyticsEnabled,
			session_replay_enabled: sessionReplayEnabled,
			preferences_answered_at: now,
			terms_accepted_at: now
		},
		{ onConflict: 'user_id' }
	);

	if (error) {
		redirect(
			`/accept-invite?step=privacy&error=${encodeURIComponent(error.message)}`
		);
	}

	revalidatePath('/', 'layout');
	redirect('/place?welcome=1&invite=1');
}

/**
 * Account → Privacy toggles. Updates existing preferences only.
 */
export async function updatePrivacyPreferences(formData: FormData) {
	const analyticsEnabled = parseBool(formData.get('analytics_enabled'));
	const sessionReplayEnabled = parseBool(formData.get('session_replay_enabled'));

	const { supabase, user } = await requireUser();
	const now = new Date().toISOString();

	const { data: existing } = await supabase
		.from('privacy_preferences')
		.select('user_id')
		.eq('user_id', user.id)
		.maybeSingle();

	if (!existing) {
		redirect(
			`/accept-invite?step=privacy&error=${encodeURIComponent(
				'Complete privacy preferences before using Account settings.'
			)}`
		);
	}

	const { error } = await supabase
		.from('privacy_preferences')
		.update({
			analytics_enabled: analyticsEnabled,
			session_replay_enabled: sessionReplayEnabled,
			preferences_answered_at: now
		})
		.eq('user_id', user.id);

	if (error) {
		redirect(
			`/account?error=${encodeURIComponent(error.message)}`
		);
	}

	revalidatePath('/account');
	revalidatePath('/', 'layout');
	redirect(
		`/account?message=${encodeURIComponent('Privacy preferences saved.')}`
	);
}
