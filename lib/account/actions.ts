'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EVENT_BAR_PALETTE } from '@/lib/attendance/event-bar-palette';

function accountRedirect(opts: { error?: string; message?: string }): never {
	const params = new URLSearchParams();
	if (opts.error) params.set('error', opts.error);
	if (opts.message) params.set('message', opts.message);
	const qs = params.toString();
	redirect(qs ? `/account?${qs}` : '/account');
}

async function requireUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error || !user) {
		redirect('/sign-in?next=/account');
	}

	return { supabase, user };
}

export async function updateFullName(formData: FormData) {
	const fullName = String(formData.get('full_name') ?? '').trim();

	if (!fullName) {
		accountRedirect({ error: 'Name is required.' });
	}
	if (fullName.length > 200) {
		accountRedirect({ error: 'Name must be 200 characters or fewer.' });
	}

	const { supabase, user } = await requireUser();

	const { error } = await supabase
		.from('profiles')
		.update({ full_name: fullName })
		.eq('id', user.id);

	if (error) {
		accountRedirect({ error: error.message });
	}

	revalidatePath('/account');
	revalidatePath('/community-calendar');
	accountRedirect({ message: 'Name saved.' });
}

export async function updateProfileColor(
	color: string
): Promise<{ error?: string }> {
	if (!(EVENT_BAR_PALETTE as readonly string[]).includes(color)) {
		return { error: 'Choose a colour from the palette.' };
	}
	const { supabase, user } = await requireUser();
	const { error: profileError } = await supabase
		.from('profiles')
		.update({ event_bar_color: color })
		.eq('id', user.id);

	if (profileError) {
		return { error: profileError.message };
	}

	revalidatePath('/account');
	revalidatePath('/community-calendar');
	return {};
}

export async function changePassword(formData: FormData) {
	const password = String(formData.get('password') ?? '');
	const confirm = String(formData.get('confirm') ?? '');

	if (!password || password.length < 8) {
		accountRedirect({ error: 'Password must be at least 8 characters.' });
	}
	if (password !== confirm) {
		accountRedirect({ error: 'Passwords do not match.' });
	}

	const { supabase } = await requireUser();
	const { error } = await supabase.auth.updateUser({ password });

	if (error) {
		accountRedirect({ error: error.message });
	}

	accountRedirect({ message: 'Password updated.' });
}
