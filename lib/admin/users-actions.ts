'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/require-admin';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export type AdminUserRow = {
	id: string;
	email: string | null;
	fullName: string;
	role: 'user' | 'admin';
	createdAt: string;
	lastSignInAt: string | null;
};

async function writeAudit(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	payload: {
		action: string;
		targetId: string;
		summary: string;
		oldValues?: Record<string, unknown> | null;
		newValues?: Record<string, unknown> | null;
	}
) {
	const { error } = await supabase.rpc('write_admin_audit', {
		p_action: payload.action,
		p_target_type: 'user',
		p_target_id: payload.targetId,
		p_summary: payload.summary,
		p_old_values: payload.oldValues ?? null,
		p_new_values: payload.newValues ?? null
	});
	if (error) {
		throw new Error(error.message);
	}
}

function revalidateUserAdminPaths() {
	revalidatePath('/members/admin/users');
	revalidatePath('/members/admin/invitations');
	revalidatePath('/community-calendar');
	revalidatePath('/account');
}

export async function listAdminUsers(opts?: {
	q?: string | null;
	role?: 'user' | 'admin' | 'all' | null;
}): Promise<AdminUserRow[]> {
	const { supabase } = await requireAdmin();
	const admin = createServiceRoleClient();

	const { data: profiles, error } = await supabase
		.from('profiles')
		.select('id, full_name, role, created_at')
		.order('full_name', { ascending: true });
	if (error) {
		throw new Error(error.message);
	}

	const { data: authData, error: authError } = await admin.auth.admin.listUsers({
		page: 1,
		perPage: 1000
	});
	if (authError) {
		throw new Error(authError.message);
	}

	const emailById = new Map<string, { email: string | null; lastSignInAt: string | null }>();
	for (const user of authData.users) {
		emailById.set(user.id, {
			email: user.email ?? null,
			lastSignInAt: user.last_sign_in_at ?? null
		});
	}

	let rows: AdminUserRow[] = (profiles ?? []).map(profile => {
		const auth = emailById.get(profile.id);
		return {
			id: profile.id,
			email: auth?.email ?? null,
			fullName: profile.full_name || 'Member',
			role: profile.role,
			createdAt: profile.created_at,
			lastSignInAt: auth?.lastSignInAt ?? null
		};
	});

	const role = opts?.role && opts.role !== 'all' ? opts.role : null;
	if (role) {
		rows = rows.filter(row => row.role === role);
	}

	const q = opts?.q?.trim().toLowerCase();
	if (q) {
		rows = rows.filter(
			row =>
				row.fullName.toLowerCase().includes(q) ||
				row.email?.toLowerCase().includes(q)
		);
	}

	return rows;
}

export async function changeUserRole(
	userId: string,
	newRole: 'user' | 'admin'
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase, user } = await requireAdmin();
		if (!userId) return { ok: false, error: 'User id is required.' };
		if (userId === user.id) {
			return { ok: false, error: 'You cannot change your own role.' };
		}
		if (newRole !== 'user' && newRole !== 'admin') {
			return { ok: false, error: 'Invalid role.' };
		}

		const { data: before } = await supabase
			.from('profiles')
			.select('id, full_name, role')
			.eq('id', userId)
			.maybeSingle();
		if (!before) return { ok: false, error: 'User not found.' };

		const { data: after, error } = await supabase.rpc('change_user_role', {
			p_user_id: userId,
			p_new_role: newRole
		});
		if (error) return { ok: false, error: error.message };

		const action = newRole === 'admin' ? 'user.promote' : 'user.demote';
		await writeAudit(supabase, {
			action,
			targetId: userId,
			summary:
				newRole === 'admin'
					? `Promoted ${before.full_name || userId} to admin`
					: `Demoted ${before.full_name || userId} to user`,
			oldValues: { role: before.role },
			newValues: { role: after?.role ?? newRole }
		});

		revalidateUserAdminPaths();
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Role change failed.'
		};
	}
}

export async function deleteUser(
	userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase, user } = await requireAdmin();
		if (!userId) return { ok: false, error: 'User id is required.' };

		const { data: target, error: targetError } = await supabase
			.from('profiles')
			.select('id, full_name, role, avatar_url')
			.eq('id', userId)
			.maybeSingle();
		if (targetError) return { ok: false, error: targetError.message };
		if (!target) return { ok: false, error: 'User not found.' };

		const { count: adminCount, error: countError } = await supabase
			.from('profiles')
			.select('id', { count: 'exact', head: true })
			.eq('role', 'admin');
		if (countError) return { ok: false, error: countError.message };

		const admins = adminCount ?? 0;
		if (target.role === 'admin' && admins <= 1) {
			return { ok: false, error: 'Cannot delete the last remaining admin.' };
		}
		if (userId === user.id && admins <= 1) {
			return {
				ok: false,
				error: 'Cannot delete your own account while you are the last admin.'
			};
		}
		if (userId === user.id) {
			return {
				ok: false,
				error:
					'Ask another admin to delete your account (self-delete is blocked).'
			};
		}

		const { count: attendanceCount } = await supabase
			.from('attendance')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId);

		// O2: remove all attendance for the user (also cascades with auth delete).
		const { error: attendanceError } = await supabase
			.from('attendance')
			.delete()
			.eq('user_id', userId);
		if (attendanceError) return { ok: false, error: attendanceError.message };

		// Preserve invite history rows by reassigning inviter ownership.
		const { error: inviteReassignError } = await supabase
			.from('user_invitations')
			.update({ invited_by: user.id })
			.eq('invited_by', userId);
		if (inviteReassignError) {
			return { ok: false, error: inviteReassignError.message };
		}

		await writeAudit(supabase, {
			action: 'user.delete',
			targetId: userId,
			summary: `Deleted user ${target.full_name || userId}`,
			oldValues: {
				full_name: target.full_name,
				role: target.role,
				attendance_deleted: attendanceCount ?? 0
			}
		});

		// Best-effort avatar cleanup before auth deletion cascades the profile.
		if (target.avatar_url) {
			const adminStorage = createServiceRoleClient();
			const candidates = ['jpg', 'png', 'webp', 'gif'].map(
				ext => `${userId}/avatar.${ext}`
			);
			await adminStorage.storage.from('avatars').remove(candidates);
		}

		const admin = createServiceRoleClient();
		const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
		if (deleteAuthError) {
			return { ok: false, error: deleteAuthError.message };
		}

		revalidateUserAdminPaths();
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Delete failed.'
		};
	}
}
