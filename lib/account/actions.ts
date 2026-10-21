'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EVENT_BAR_PALETTE } from '@/lib/attendance/event-bar-palette';
import { isManualLanguage } from '@/lib/docs/manual-language';

function accountRedirect(opts: { error?: string; message?: string }): never {
	const params = new URLSearchParams();
	if (opts.error) params.set('error', opts.error);
	if (opts.message) params.set('message', opts.message);
	const qs = params.toString();
	redirect(qs ? `/account?${qs}` : '/account');
}

function changeNameRedirect(opts: { error?: string }): never {
	const params = new URLSearchParams();
	if (opts.error) params.set('error', opts.error);
	const qs = params.toString();
	redirect(qs ? `/account/change-name?${qs}` : '/account/change-name');
}

export async function updateFullName(formData: FormData) {
	const fullName = String(formData.get('full_name') ?? '').trim();

	if (!fullName) {
		changeNameRedirect({ error: 'Name is required.' });
	}
	if (fullName.length > 200) {
		changeNameRedirect({
			error: 'Name must be 200 characters or fewer.'
		});
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/sign-in?next=/account/change-name');
	}

	const { error } = await supabase
		.from('profiles')
		.update({ full_name: fullName })
		.eq('id', user.id);

	if (error) {
		changeNameRedirect({ error: error.message });
	}

	revalidatePath('/account');
	revalidatePath('/account/change-name');
	revalidatePath('/community-calendar');
	accountRedirect({ message: 'Name saved.' });
}

function changeColourRedirect(opts: { error?: string }): never {
	const params = new URLSearchParams();
	if (opts.error) params.set('error', opts.error);
	const qs = params.toString();
	redirect(qs ? `/account/change-colour?${qs}` : '/account/change-colour');
}

export async function updateProfileColor(formData: FormData) {
	const color = String(formData.get('color') ?? '');

	if (!(EVENT_BAR_PALETTE as readonly string[]).includes(color)) {
		changeColourRedirect({ error: 'Choose a colour from the palette.' });
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/sign-in?next=/account/change-colour');
	}

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ event_bar_color: color })
		.eq('id', user.id);

	if (profileError) {
		changeColourRedirect({ error: profileError.message });
	}

	revalidatePath('/account');
	revalidatePath('/account/change-colour');
	revalidatePath('/community-calendar');
	accountRedirect({ message: 'Profile colour updated.' });
}

function changeLanguageRedirect(opts: { error?: string }): never {
	const params = new URLSearchParams();
	if (opts.error) params.set('error', opts.error);
	const qs = params.toString();
	redirect(qs ? `/account/change-language?${qs}` : '/account/change-language');
}

export async function updateLanguage(formData: FormData) {
	const language = String(formData.get('language') ?? '');

	if (!isManualLanguage(language)) {
		changeLanguageRedirect({
			error: 'Choose English, Deutsch, or Italiano.'
		});
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/sign-in?next=/account/change-language');
	}

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ language })
		.eq('id', user.id);

	if (profileError) {
		changeLanguageRedirect({ error: profileError.message });
	}

	revalidatePath('/', 'layout');
	revalidatePath('/account');
	revalidatePath('/account/change-language');
	revalidatePath('/account/user-manual-member');
	revalidatePath('/account/user-manual-admin');
	accountRedirect({ message: 'Language updated.' });
}

function userManualReminderRedirect(opts: { error?: string }): never {
	const params = new URLSearchParams();
	if (opts.error) params.set('error', opts.error);
	const qs = params.toString();
	redirect(
		qs
			? `/account/user-manual-reminder?${qs}`
			: '/account/user-manual-reminder'
	);
}

export async function updateHelpFabHintEnabled(formData: FormData) {
	const raw = String(formData.get('help_fab_hint_enabled') ?? '');
	const enabled = raw === 'true';

	if (raw !== 'true' && raw !== 'false') {
		userManualReminderRedirect({
			error: 'Choose a user manual reminder preference.'
		});
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/sign-in?next=/account/user-manual-reminder');
	}

	const { error } = await supabase
		.from('profiles')
		.update({ help_fab_hint_enabled: enabled })
		.eq('id', user.id);

	if (error) {
		userManualReminderRedirect({ error: error.message });
	}

	revalidatePath('/', 'layout');
	revalidatePath('/account');
	revalidatePath('/account/user-manual-reminder');
	accountRedirect({
		message: enabled
			? 'User manual reminder turned on.'
			: 'User manual reminder turned off permanently.'
	});
}

function changePasswordRedirect(opts: {
	error?: string;
}): never {
	const params = new URLSearchParams();
	if (opts.error) params.set('error', opts.error);
	const qs = params.toString();
	redirect(qs ? `/account/change-password?${qs}` : '/account/change-password');
}

export async function changePassword(formData: FormData) {
	const password = String(formData.get('password') ?? '');
	const confirm = String(formData.get('confirm') ?? '');

	if (!password || password.length < 8) {
		changePasswordRedirect({
			error: 'Password must be at least 8 characters.'
		});
	}
	if (password !== confirm) {
		changePasswordRedirect({ error: 'Passwords do not match.' });
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/sign-in?next=/account/change-password');
	}

	const { error } = await supabase.auth.updateUser({ password });

	if (error) {
		changePasswordRedirect({ error: error.message });
	}

	accountRedirect({ message: 'Password updated.' });
}
