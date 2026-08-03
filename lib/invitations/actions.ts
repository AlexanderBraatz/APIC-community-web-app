'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/require-admin';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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

function siteOrigin() {
	return (
		process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
		'http://localhost:3000'
	);
}

function inviteRedirectTo() {
	return `${siteOrigin()}/auth/confirm?next=${encodeURIComponent('/accept-invite')}`;
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
		p_old_values: payload.oldValues ?? null,
		p_new_values: payload.newValues ?? null
	});
	if (error) {
		throw new Error(error.message);
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

export async function inviteUser(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase, user } = await requireAdmin();
		const email = normalizeEmail(String(formData.get('email') ?? ''));

		if (!email || !email.includes('@')) {
			return { ok: false, error: 'Enter a valid email address.' };
		}

		const admin = createServiceRoleClient();

		const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({
			page: 1,
			perPage: 1000
		});
		if (listError) {
			return { ok: false, error: listError.message };
		}

		const existing = existingUsers.users.find(
			u => u.email?.toLowerCase() === email
		);
		if (existing?.email_confirmed_at || existing?.last_sign_in_at) {
			return { ok: false, error: 'That email already belongs to a registered user.' };
		}

		const { data: pendingInvite } = await supabase
			.from('user_invitations')
			.select('id')
			.eq('status', 'pending')
			.ilike('email', email)
			.maybeSingle();

		if (pendingInvite) {
			return { ok: false, error: 'A pending invitation already exists for that email.' };
		}

		if (existing?.id) {
			await admin.auth.admin.deleteUser(existing.id);
		}

		const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
			email,
			{ redirectTo: inviteRedirectTo() }
		);

		if (inviteError) {
			return { ok: false, error: inviteError.message };
		}

		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		const { data: invitation, error: insertError } = await supabase
			.from('user_invitations')
			.insert({
				email,
				invited_by: user.id,
				status: 'pending',
				expires_at: expiresAt.toISOString(),
				last_sent_at: new Date().toISOString(),
				auth_user_id: invited.user?.id ?? null
			})
			.select('id')
			.single();

		if (insertError) {
			return { ok: false, error: insertError.message };
		}

		await writeAudit(supabase, {
			action: 'user.invited',
			targetType: 'user_invitation',
			targetId: invitation.id,
			summary: `Invited ${email}`,
			newValues: { email, auth_user_id: invited.user?.id ?? null }
		});

		revalidatePath('/members/admin');
		revalidatePath('/members/admin/invitations');
		revalidatePath('/members/admin/audit-log');
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Invite failed.'
		};
	}
}

export async function resendInvitation(
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
			return { ok: false, error: 'Only pending invitations can be resent.' };
		}

		const admin = createServiceRoleClient();

		if (invitation.auth_user_id) {
			const { data: authUser } = await admin.auth.admin.getUserById(
				invitation.auth_user_id
			);
			if (authUser.user && !authUser.user.last_sign_in_at) {
				await admin.auth.admin.deleteUser(invitation.auth_user_id);
			}
		}

		const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
			invitation.email,
			{ redirectTo: inviteRedirectTo() }
		);

		if (inviteError) {
			return { ok: false, error: inviteError.message };
		}

		const { error: updateError } = await supabase
			.from('user_invitations')
			.update({
				last_sent_at: new Date().toISOString(),
				auth_user_id: invited.user?.id ?? invitation.auth_user_id
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

		revalidatePath('/members/admin');
		revalidatePath('/members/admin/invitations');
		revalidatePath('/members/admin/audit-log');
		return { ok: true };
	} catch (error) {
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
			// Only remove Auth users who never completed signup.
			if (authUser.user && !authUser.user.email_confirmed_at) {
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

		revalidatePath('/members/admin');
		revalidatePath('/members/admin/invitations');
		revalidatePath('/members/admin/audit-log');
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Cancel failed.'
		};
	}
}

export async function completeInviteAcceptance(formData: FormData): Promise<void> {
	const password = String(formData.get('password') ?? '');
	const confirm = String(formData.get('confirm') ?? '');

	if (password.length < 8) {
		throw new Error('Password must be at least 8 characters.');
	}
	if (password !== confirm) {
		throw new Error('Passwords do not match.');
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user?.email) {
		throw new Error('Open the invitation link from your email first.');
	}

	const { error: passwordError } = await supabase.auth.updateUser({ password });
	if (passwordError) {
		throw new Error(passwordError.message);
	}

	const admin = createServiceRoleClient();
	const email = user.email.toLowerCase();

	const { data: invitation } = await admin
		.from('user_invitations')
		.select('id, status')
		.eq('status', 'pending')
		.ilike('email', email)
		.maybeSingle();

	if (invitation) {
		await admin
			.from('user_invitations')
			.update({
				status: 'accepted',
				accepted_at: new Date().toISOString(),
				auth_user_id: user.id
			})
			.eq('id', invitation.id);
	}
}
