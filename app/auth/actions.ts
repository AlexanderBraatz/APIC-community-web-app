'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSiteOrigin } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(next: string | null | undefined) {
	if (!next || !next.startsWith('/') || next.startsWith('//')) {
		return '/place';
	}
	return next;
}

export async function signInWithPassword(formData: FormData) {
	const email = String(formData.get('email') ?? '').trim();
	const password = String(formData.get('password') ?? '');
	const next = safeNextPath(String(formData.get('next') ?? '/place'));

	if (!email || !password) {
		redirect(`/sign-in?error=${encodeURIComponent('Email and password are required.')}&next=${encodeURIComponent(next)}`);
	}

	const supabase = await createClient();
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		redirect(
			`/sign-in?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
		);
	}

	revalidatePath('/', 'layout');
	const separator = next.includes('?') ? '&' : '?';
	redirect(`${next}${separator}welcome=1`);
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut();
	revalidatePath('/', 'layout');
	redirect('/sign-in?signed_out=1');
}

export async function requestPasswordReset(formData: FormData) {
	const email = String(formData.get('email') ?? '').trim();

	if (!email) {
		redirect(
			`/forgot-password?error=${encodeURIComponent('Email is required.')}`
		);
	}

	const supabase = await createClient();
	const origin = getSiteOrigin();

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${origin}/auth/confirm?next=/reset-password`
	});

	if (error) {
		redirect(
			`/forgot-password?error=${encodeURIComponent(error.message)}`
		);
	}

	redirect(
		`/forgot-password?message=${encodeURIComponent('If that email is registered, a reset link is on its way.')}`
	);
}

export async function updatePassword(formData: FormData) {
	const password = String(formData.get('password') ?? '');
	const confirm = String(formData.get('confirm') ?? '');

	if (!password || password.length < 8) {
		redirect(
			`/reset-password?error=${encodeURIComponent('Password must be at least 8 characters.')}`
		);
	}

	if (password !== confirm) {
		redirect(
			`/reset-password?error=${encodeURIComponent('Passwords do not match.')}`
		);
	}

	const supabase = await createClient();
	const { error } = await supabase.auth.updateUser({ password });

	if (error) {
		redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
	}

	redirect('/place');
}
