'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
	limitResetOtpByClient,
	limitResetOtpRequest
} from '@/lib/admin/rate-limit';
import { getRequestOrigin } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(next: string | null | undefined) {
	if (!next || !next.startsWith('/') || next.startsWith('//')) {
		return '/place';
	}
	return next;
}

function normalizeEmail(value: string) {
	return value.trim().toLowerCase();
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

export async function requestPasswordReset(
	formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
	const email = normalizeEmail(String(formData.get('email') ?? ''));

	if (!email || !email.includes('@')) {
		return { ok: false, error: 'Enter a valid email address.' };
	}

	const emailRate = limitResetOtpRequest(email);
	if (!emailRate.ok) {
		return { ok: false, error: emailRate.error };
	}

	const headerStore = await headers();
	const clientKey =
		headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		headerStore.get('x-real-ip') ||
		'unknown';
	const clientRate = limitResetOtpByClient(clientKey);
	if (!clientRate.ok) {
		return { ok: false, error: clientRate.error };
	}

	const supabase = await createClient();
	const origin = await getRequestOrigin();

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${origin}/forgot-password/verify?email=${encodeURIComponent(email)}`
	});

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true };
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
