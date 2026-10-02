'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function parseBool(value: FormDataEntryValue | null): boolean {
	return value === 'true' || value === 'on' || value === '1';
}

async function requireUser(signInNext?: string) {
	const supabase = await createClient();
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error || !user) {
		redirect(signInNext ? `/sign-in?next=${signInNext}` : '/sign-in');
	}

	return { supabase, user };
}

/**
 * First-time invite privacy step: requires Terms acceptance, then stores
 * optional analytics / session-replay preferences from the toggle values.
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

	const analyticsEnabled = parseBool(formData.get('analytics_enabled'));
	const sessionReplayEnabled = parseBool(
		formData.get('session_replay_enabled')
	);

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

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ onboarding_step: 'name' })
		.eq('id', user.id);

	if (profileError) {
		redirect(
			`/accept-invite?step=privacy&error=${encodeURIComponent(
				profileError.message
			)}`
		);
	}

	revalidatePath('/', 'layout');
	revalidatePath('/accept-invite');
	redirect('/accept-invite?step=name');
}

/**
 * Account → Privacy toggles. Updates existing preferences only.
 */
export async function updatePrivacyPreferences(formData: FormData) {
	const analyticsEnabled = parseBool(formData.get('analytics_enabled'));
	const sessionReplayEnabled = parseBool(formData.get('session_replay_enabled'));

	const { supabase, user } = await requireUser('/account/privacy');
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
			`/account/privacy?error=${encodeURIComponent(error.message)}`
		);
	}

	revalidatePath('/account');
	revalidatePath('/account/privacy');
	revalidatePath('/', 'layout');
	redirect(
		`/account?message=${encodeURIComponent('Privacy preferences saved.')}`
	);
}
