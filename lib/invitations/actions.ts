'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
	limitInvite,
	limitInviteBulk,
	limitInviteOtpByClient,
	limitInviteOtpRequest
} from '@/lib/admin/rate-limit';
import { EVENT_BAR_PALETTE } from '@/lib/attendance/event-bar-palette';
import { captureServerActionException } from '@/lib/sentry/capture';
import { getRequestOrigin } from '@/lib/site-url';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { isIncompleteInviteOnboardingStep } from '@/lib/invitations/onboarding-steps';

export type InvitationListItem = {
	id: string;
	email: string;
	status: 'pending' | 'accepted' | 'expired' | 'cancelled';
	invited_at: string;
	last_sent_at: string;
	accepted_at: string | null;
	cancelled_at: string | null;
	expires_at: string | null;
	invited_by: string;
	inviter_name: string | null;
};

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

async function inviteMagicRedirectTo() {
	const origin = await getRequestOrigin();
	// Invite template appends ?token_hash=…&type=invite to this URL.
	return `${origin}/accept-invite/confirm`;
}

async function inviteOtcRedirectTo(email: string) {
	const origin = await getRequestOrigin();
	return `${origin}/accept-invite/verify?email=${encodeURIComponent(email)}`;
}

function revalidateInvitationPaths() {
	revalidatePath('/members/admin');
	revalidatePath('/members/admin/invitations');
	revalidatePath('/members/admin/audit-log');
}

async function writeAudit(
	supabase: Awaited<ReturnType<typeof createClient>>,
	payload: {
		action: string;
		targetType: string;
		targetId: string;
		summary: string;
		oldValues?: Record<string, unknown> | null;
		newValues?: Record<string, unknown> | null;
	}
) {
	const { error } = await supabase.rpc('write_admin_audit', {
		p_action: payload.action,
		p_target_type: payload.targetType,
		p_target_id: payload.targetId,
		p_summary: payload.summary,
		p_old_values: (payload.oldValues ?? null) as Json | null,
		p_new_values: (payload.newValues ?? null) as Json | null
	});
	if (error) {
		throw new Error(error.message);
	}
}

/**
 * True when the auth user started joining but has not finished the invite
 * wizard (so a fresh invite code may reset them).
 */
async function isIncompleteInvitee(userId: string): Promise<boolean> {
	const admin = createServiceRoleClient();

	const { data: prefs } = await admin
		.from('privacy_preferences')
		.select('user_id')
		.eq('user_id', userId)
		.maybeSingle();

	const { data: profile } = await admin
		.from('profiles')
		.select('onboarding_step')
		.eq('id', userId)
		.maybeSingle();

	if (!prefs) {
		return true;
	}

	const step = profile?.onboarding_step;
	if (isIncompleteInviteOnboardingStep(step)) {
		return true;
	}
	// Legacy complete: privacy prefs exist and onboarding_step is null.
	if (step === 'done' || step == null) {
		return false;
	}

	return true;
}

/**
 * Send (or resend) a magic-link invite email. Deletes a prior auth user when
 * they never finished joining so inviteUserByEmail can issue a fresh link.
 */
async function sendInviteMagicEmail(
	email: string,
	existingAuthUserId: string | null
): Promise<{ ok: true; authUserId: string | null } | { ok: false; error: string }> {
	const admin = createServiceRoleClient();

	if (existingAuthUserId) {
		const { data: authUser } = await admin.auth.admin.getUserById(
			existingAuthUserId
		);
		if (
			authUser.user &&
			!authUser.user.last_sign_in_at &&
			!authUser.user.email_confirmed_at
		) {
			await admin.auth.admin.deleteUser(existingAuthUserId);
		} else if (authUser.user?.email_confirmed_at || authUser.user?.last_sign_in_at) {
			// Mid-onboarding: allow reset so they can receive a new invite after
			// giving up / losing the email. Finished members stay blocked.
			if (await isIncompleteInvitee(existingAuthUserId)) {
				await admin.auth.admin.deleteUser(existingAuthUserId);
			} else {
				return {
					ok: false,
					error: 'That email already belongs to a registered user.'
				};
			}
		}
	}

	const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
		email,
		{ redirectTo: await inviteMagicRedirectTo() }
	);

	if (inviteError) {
		return { ok: false, error: inviteError.message };
	}

	return { ok: true, authUserId: invited.user?.id ?? null };
}

/**
 * Send an OTC email for a pending invitee (Magic Link Auth template).
 * Does not delete the auth user — used when the magic link failed.
 *
 * Hosted Auth has public sign-ups disabled. For invited users who are still
 * "Waiting for verification", signInWithOtp is treated as signup and returns
 * "Signups not allowed for this instance". Confirm the allowlisted auth user
 * via admin first, then send OTC with the anon client (shouldCreateUser: false).
 */
async function sendInviteOtcEmail(
	email: string,
	existingAuthUserId: string | null
): Promise<{ ok: true; authUserId: string | null } | { ok: false; error: string }> {
	const admin = createServiceRoleClient();
	let authUserId = existingAuthUserId;

	if (authUserId) {
		const { data: authUser } = await admin.auth.admin.getUserById(authUserId);
		if (!authUser.user) {
			authUserId = null;
		} else if (
			(authUser.user.email_confirmed_at || authUser.user.last_sign_in_at) &&
			!(await isIncompleteInvitee(authUserId))
		) {
			return {
				ok: false,
				error: 'That email already belongs to a registered user.'
			};
		}
	}

	if (!authUserId) {
		const { data: created, error: createError } = await admin.auth.admin.createUser({
			email,
			email_confirm: true
		});
		if (createError) {
			// Auth user may already exist under another id — resolve via generateLink.
			const alreadyExists = /already|registered|exists/i.test(createError.message);
			if (!alreadyExists) {
				return { ok: false, error: createError.message };
			}
			const { data: linked, error: linkError } = await admin.auth.admin.generateLink({
				type: 'magiclink',
				email,
				options: { redirectTo: await inviteOtcRedirectTo(email) }
			});
			if (linkError) {
				return { ok: false, error: linkError.message };
			}
			authUserId = linked.user?.id ?? null;
		} else {
			authUserId = created.user?.id ?? null;
		}
	}

	if (authUserId) {
		const { data: authUser } = await admin.auth.admin.getUserById(authUserId);
		if (authUser.user && !authUser.user.email_confirmed_at) {
			const { error: confirmError } = await admin.auth.admin.updateUserById(
				authUserId,
				{ email_confirm: true }
			);
			if (confirmError) {
				return { ok: false, error: confirmError.message };
			}
		}
	}

	const { url, key } = getSupabaseEnv();
	const anon = createSupabaseJsClient(url, key, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	const { error: otpError } = await anon.auth.signInWithOtp({
		email,
		options: {
			shouldCreateUser: false,
			emailRedirectTo: await inviteOtcRedirectTo(email)
		}
	});

	if (otpError) {
		return { ok: false, error: otpError.message };
	}

	return { ok: true, authUserId };
}

async function markInvitationAccepted(user: {
	id: string;
	email?: string | null;
}): Promise<void> {
	const email = user.email?.trim().toLowerCase();
	if (!email) return;

	const admin = createServiceRoleClient();
	const { data: invitation, error: lookupError } = await admin
		.from('user_invitations')
		.select('id')
		.eq('status', 'pending')
		.eq('email', email)
		.maybeSingle();

	if (lookupError) {
		throw new Error(lookupError.message);
	}
	if (!invitation) return;

	const { error: updateError } = await admin
		.from('user_invitations')
		.update({
			status: 'accepted',
			accepted_at: new Date().toISOString(),
			auth_user_id: user.id
		})
		.eq('id', invitation.id);

	if (updateError) {
		throw new Error(updateError.message);
	}
}

export async function listInvitations(): Promise<InvitationListItem[]> {
	const { supabase } = await requireAdmin();
	const { data, error } = await supabase
		.from('user_invitations')
		.select(
			'id, email, status, invited_at, last_sent_at, accepted_at, cancelled_at, expires_at, invited_by'
		)
		.order('invited_at', { ascending: false });

	if (error) {
		throw new Error(error.message);
	}

	const inviterIds = [...new Set((data ?? []).map(row => row.invited_by))];
	const { data: inviters } = inviterIds.length
		? await supabase.from('profiles').select('id, full_name').in('id', inviterIds)
		: { data: [] as { id: string; full_name: string }[] };

	const nameById = new Map((inviters ?? []).map(row => [row.id, row.full_name]));

	return (data ?? []).map(row => ({
		id: row.id,
		email: row.email,
		status: row.status,
		invited_at: row.invited_at,
		last_sent_at: row.last_sent_at,
		accepted_at: row.accepted_at,
		cancelled_at: row.cancelled_at,
		expires_at: row.expires_at,
		invited_by: row.invited_by,
		inviter_name: nameById.get(row.invited_by) ?? null
	}));
}

async function inviteOneEmail(
	supabase: Awaited<ReturnType<typeof createClient>>,
	adminUserId: string,
	emailRaw: string
): Promise<{ ok: true; email: string } | { ok: false; email: string; error: string }> {
	const email = normalizeEmail(emailRaw);

	if (!email || !email.includes('@')) {
		return { ok: false, email: emailRaw, error: 'Enter a valid email address.' };
	}

	const admin = createServiceRoleClient();

	const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({
		page: 1,
		perPage: 1000
	});
	if (listError) {
		captureServerActionException(listError, 'invite_user', {
			step: 'list_users'
		});
		return { ok: false, email, error: listError.message };
	}

	const existing = existingUsers.users.find(u => u.email?.toLowerCase() === email);
	if (existing?.email_confirmed_at || existing?.last_sign_in_at) {
		return {
			ok: false,
			email,
			error: 'That email already belongs to a registered user.'
		};
	}

	const { data: pendingInvite } = await supabase
		.from('user_invitations')
		.select('id')
		.eq('status', 'pending')
		.ilike('email', email)
		.maybeSingle();

	if (pendingInvite) {
		return {
			ok: false,
			email,
			error: 'A pending invitation already exists for that email.'
		};
	}

	const sent = await sendInviteMagicEmail(email, existing?.id ?? null);
	if (!sent.ok) {
		captureServerActionException(new Error(sent.error), 'invite_user', {
			step: 'invite_email'
		});
		return { ok: false, email, error: sent.error };
	}

	const { data: invitation, error: insertError } = await supabase
		.from('user_invitations')
		.insert({
			email,
			invited_by: adminUserId,
			status: 'pending',
			expires_at: null,
			last_sent_at: new Date().toISOString(),
			auth_user_id: sent.authUserId
		})
		.select('id')
		.single();

	if (insertError) {
		captureServerActionException(insertError, 'invite_user', {
			step: 'insert_invitation'
		});
		return { ok: false, email, error: insertError.message };
	}

	await writeAudit(supabase, {
		action: 'user.invited',
		targetType: 'user_invitation',
		targetId: invitation.id,
		summary: `Invited ${email}`,
		newValues: { email, auth_user_id: sent.authUserId }
	});

	return { ok: true, email };
}

export async function inviteUser(
	formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase, user } = await requireAdmin();
		const rate = limitInvite(user.id);
		if (!rate.ok) {
			return { ok: false, error: rate.error };
		}

		const result = await inviteOneEmail(
			supabase,
			user.id,
			String(formData.get('email') ?? '')
		);
		if (!result.ok) {
			return { ok: false, error: result.error };
		}

		revalidateInvitationPaths();
		return { ok: true };
	} catch (error) {
		captureServerActionException(error, 'invite_user');
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Invite failed.'
		};
	}
}

export async function inviteUsersBulk(
	formData: FormData
): Promise<
	| { ok: true; invited: number; skipped: number; errors: string[] }
	| { ok: false; error: string }
> {
	try {
		const { supabase, user } = await requireAdmin();
		const rate = limitInviteBulk(user.id);
		if (!rate.ok) {
			return { ok: false, error: rate.error };
		}

		const raw = String(formData.get('emails') ?? '');
		const emails = [
			...new Set(
				raw
					.split(/[\n,;]+/)
					.map(part => normalizeEmail(part))
					.filter(Boolean)
			)
		];

		if (emails.length === 0) {
			return { ok: false, error: 'Enter at least one email address.' };
		}
		if (emails.length > 50) {
			return { ok: false, error: 'Invite at most 50 emails at a time.' };
		}

		let invited = 0;
		let skipped = 0;
		const errors: string[] = [];

		for (const email of emails) {
			const result = await inviteOneEmail(supabase, user.id, email);
			if (result.ok) {
				invited += 1;
			} else {
				skipped += 1;
				errors.push(`${result.email}: ${result.error}`);
			}
		}

		revalidateInvitationPaths();
		return { ok: true, invited, skipped, errors };
	} catch (error) {
		captureServerActionException(error, 'invite_users_bulk');
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Bulk invite failed.'
		};
	}
}

export async function resendInvitation(
	invitationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase, user } = await requireAdmin();
		const rate = limitInvite(user.id);
		if (!rate.ok) {
			return { ok: false, error: rate.error };
		}
		const { data: invitation, error } = await supabase
			.from('user_invitations')
			.select('id, email, status, auth_user_id')
			.eq('id', invitationId)
			.maybeSingle();

		if (error) {
			return { ok: false, error: error.message };
		}
		if (!invitation || invitation.status !== 'pending') {
			return { ok: false, error: 'Only pending invitations can be resent.' };
		}

		const sent = await sendInviteMagicEmail(
			invitation.email,
			invitation.auth_user_id
		);
		if (!sent.ok) {
			captureServerActionException(new Error(sent.error), 'resend_invitation', {
				step: 'invite_email'
			});
			return { ok: false, error: sent.error };
		}

		const { error: updateError } = await supabase
			.from('user_invitations')
			.update({
				last_sent_at: new Date().toISOString(),
				auth_user_id: sent.authUserId ?? invitation.auth_user_id,
				expires_at: null
			})
			.eq('id', invitation.id);

		if (updateError) {
			return { ok: false, error: updateError.message };
		}

		await writeAudit(supabase, {
			action: 'user.invitation_resent',
			targetType: 'user_invitation',
			targetId: invitation.id,
			summary: `Resent invitation to ${invitation.email}`
		});

		revalidateInvitationPaths();
		return { ok: true };
	} catch (error) {
		captureServerActionException(error, 'resend_invitation');
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Resend failed.'
		};
	}
}

export async function cancelInvitation(
	invitationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase } = await requireAdmin();
		const { data: invitation, error } = await supabase
			.from('user_invitations')
			.select('id, email, status, auth_user_id')
			.eq('id', invitationId)
			.maybeSingle();

		if (error) {
			return { ok: false, error: error.message };
		}
		if (!invitation || invitation.status !== 'pending') {
			return { ok: false, error: 'Only pending invitations can be cancelled.' };
		}

		const { error: updateError } = await supabase
			.from('user_invitations')
			.update({
				status: 'cancelled',
				cancelled_at: new Date().toISOString()
			})
			.eq('id', invitation.id);

		if (updateError) {
			return { ok: false, error: updateError.message };
		}

		if (invitation.auth_user_id) {
			const admin = createServiceRoleClient();
			const { data: authUser } = await admin.auth.admin.getUserById(
				invitation.auth_user_id
			);
			// Remove Auth users who never finished joining (including mid-wizard).
			if (
				authUser.user &&
				(!authUser.user.email_confirmed_at ||
					(await isIncompleteInvitee(invitation.auth_user_id)))
			) {
				await admin.auth.admin.deleteUser(invitation.auth_user_id);
			}
		}

		await writeAudit(supabase, {
			action: 'user.invitation_cancelled',
			targetType: 'user_invitation',
			targetId: invitation.id,
			summary: `Cancelled invitation for ${invitation.email}`,
			oldValues: { status: 'pending' },
			newValues: { status: 'cancelled' }
		});

		revalidateInvitationPaths();
		return { ok: true };
	} catch (error) {
		captureServerActionException(error, 'cancel_invitation');
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Cancel failed.'
		};
	}
}

/**
 * Public: allowlisted invitee requests an OTC email (pending invitation required).
 * Used when the magic-link invite failed or expired.
 */
export async function requestInviteOtp(
	formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const email = normalizeEmail(String(formData.get('email') ?? ''));
		if (!email || !email.includes('@')) {
			return { ok: false, error: 'Enter a valid email address.' };
		}

		const emailRate = limitInviteOtpRequest(email);
		if (!emailRate.ok) {
			return { ok: false, error: emailRate.error };
		}

		const headerStore = await headers();
		const clientKey =
			headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
			headerStore.get('x-real-ip') ||
			'unknown';
		const clientRate = limitInviteOtpByClient(clientKey);
		if (!clientRate.ok) {
			return { ok: false, error: clientRate.error };
		}

		const admin = createServiceRoleClient();
		const { data: invitation, error } = await admin
			.from('user_invitations')
			.select('id, email, status, auth_user_id')
			.eq('status', 'pending')
			.ilike('email', email)
			.maybeSingle();

		if (error) {
			captureServerActionException(error, 'request_invite_otp', {
				step: 'lookup_invitation'
			});
			return { ok: false, error: 'Could not request a new code. Try again.' };
		}

		if (!invitation) {
			return {
				ok: false,
				error: 'That email is not on the approved invitation list.'
			};
		}

		const sent = await sendInviteOtcEmail(invitation.email, invitation.auth_user_id);
		if (!sent.ok) {
			captureServerActionException(new Error(sent.error), 'request_invite_otp', {
				step: 'invite_otc_email'
			});
			return { ok: false, error: sent.error };
		}

		const { error: updateError } = await admin
			.from('user_invitations')
			.update({
				last_sent_at: new Date().toISOString(),
				auth_user_id: sent.authUserId ?? invitation.auth_user_id,
				expires_at: null
			})
			.eq('id', invitation.id);

		if (updateError) {
			captureServerActionException(updateError, 'request_invite_otp', {
				step: 'update_invitation'
			});
			return { ok: false, error: 'Could not request a new code. Try again.' };
		}

		return { ok: true };
	} catch (error) {
		captureServerActionException(error, 'request_invite_otp');
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Could not request a new code.'
		};
	}
}

function inviteStepRedirect(
	step: string,
	opts?: { error?: string }
): never {
	const params = new URLSearchParams();
	params.set('step', step);
	if (opts?.error) params.set('error', opts.error);
	redirect(`/accept-invite?${params.toString()}`);
}

export async function setInvitePassword(formData: FormData): Promise<void> {
	const password = String(formData.get('password') ?? '');
	const confirm = String(formData.get('confirm') ?? '');

	if (password.length < 8) {
		throw new Error('Password must be at least 8 characters.');
	}
	if (password !== confirm) {
		throw new Error('Passwords do not match.');
	}

	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: userError
		} = await supabase.auth.getUser();

		if (userError || !user?.email) {
			throw new Error('Enter your invitation code first.');
		}

		const { error: passwordError } = await supabase.auth.updateUser({
			password
		});
		if (passwordError) {
			throw new Error(passwordError.message);
		}

		// Stay on the allowlist until the full join wizard finishes so admins
		// can resend an invitation if the member abandons mid-onboarding.
		const admin = createServiceRoleClient();
		const { data: authUser, error: authLookupError } =
			await admin.auth.admin.getUserById(user.id);
		if (authLookupError) {
			throw new Error(authLookupError.message);
		}

		const { error: metaError } = await admin.auth.admin.updateUserById(
			user.id,
			{
				app_metadata: {
					...(authUser.user?.app_metadata ?? {}),
					invite_password_set: true
				}
			}
		);
		if (metaError) {
			throw new Error(metaError.message);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : '';
		const isUserFacing =
			message === 'Enter your invitation code first.' ||
			message === 'Password must be at least 8 characters.' ||
			message === 'Passwords do not match.';
		if (!isUserFacing) {
			captureServerActionException(error, 'set_invite_password');
		}
		throw error;
	}
}

export async function setInviteShownName(formData: FormData): Promise<void> {
	const fullName = String(formData.get('full_name') ?? '').trim();

	if (!fullName) {
		inviteStepRedirect('name', { error: 'Name is required.' });
	}
	if (fullName.length > 200) {
		inviteStepRedirect('name', {
			error: 'Name must be 200 characters or fewer.'
		});
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/accept-invite');
	}

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ full_name: fullName, onboarding_step: 'colour' })
		.eq('id', user.id);

	if (profileError) {
		inviteStepRedirect('name', { error: profileError.message });
	}

	revalidatePath('/accept-invite');
	inviteStepRedirect('colour');
}

export async function setInviteColour(formData: FormData): Promise<void> {
	const color = String(formData.get('color') ?? '');

	if (!(EVENT_BAR_PALETTE as readonly string[]).includes(color)) {
		inviteStepRedirect('colour', {
			error: 'Choose a colour from the palette.'
		});
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/accept-invite');
	}

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ event_bar_color: color, onboarding_step: 'favorites' })
		.eq('id', user.id);

	if (profileError) {
		inviteStepRedirect('colour', { error: profileError.message });
	}

	revalidatePath('/accept-invite');
	revalidatePath('/community-calendar');
	inviteStepRedirect('favorites');
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveInviteFavorites(formData: FormData): Promise<void> {
	const raw = String(formData.get('favorite_ids') ?? '');
	const favoriteIds = raw
		.split(',')
		.map(id => id.trim())
		.filter(id => UUID_RE.test(id));

	await finishInviteFavorites(favoriteIds);
}

export async function skipInviteFavorites(_formData?: FormData): Promise<void> {
	await finishInviteFavorites(null);
}

async function finishInviteFavorites(
	favoriteIds: string[] | null
): Promise<void> {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/accept-invite');
	}

	if (favoriteIds) {
		const pinnedMemberIds = favoriteIds.filter(id => id !== user.id);
		const { data: existing } = await supabase
			.from('scheduler_preferences')
			.select('font_size')
			.eq('user_id', user.id)
			.maybeSingle();

		const { error: prefsError } = await supabase
			.from('scheduler_preferences')
			.upsert(
				{
					user_id: user.id,
					font_size: existing?.font_size ?? 'medium',
					pinned_member_ids: pinnedMemberIds
				},
				{ onConflict: 'user_id' }
			);

		if (prefsError) {
			inviteStepRedirect('favorites', { error: prefsError.message });
		}
	}

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ onboarding_step: 'done' })
		.eq('id', user.id);

	if (profileError) {
		inviteStepRedirect('favorites', { error: profileError.message });
	}

	try {
		await markInvitationAccepted(user);
	} catch (error) {
		captureServerActionException(error, 'finish_invite_favorites', {
			step: 'mark_invitation_accepted'
		});
		inviteStepRedirect('favorites', {
			error:
				error instanceof Error
					? error.message
					: 'Could not finish joining. Try again.'
		});
	}

	revalidatePath('/accept-invite');
	revalidatePath('/members/admin/invitations');
	revalidatePath('/community-calendar');
	revalidatePath('/', 'layout');
	redirect('/account/user-manual-member?welcome=1&invite=1&from=invite');
}
