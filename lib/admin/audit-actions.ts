import { requireAdmin } from '@/lib/admin/require-admin';

export const AUDIT_ACTIONS = [
	'user.invited',
	'user.invitation_resent',
	'user.invitation_cancelled',
	'user.promote',
	'user.demote',
	'user.delete',
	'listing.create',
	'listing.update',
	'listing.delete',
	'listing.geocode',
	'tag.create'
] as const;

export const AUDIT_TARGET_TYPES = [
	'user',
	'user_invitation',
	'listing',
	'tag'
] as const;

export type AuditLogRow = {
	id: string;
	adminUserId: string | null;
	adminName: string | null;
	action: string;
	targetType: string;
	targetId: string | null;
	summary: string;
	oldValues: Record<string, unknown> | null;
	newValues: Record<string, unknown> | null;
	createdAt: string;
};

export type AdminDashboardCounts = {
	users: number;
	admins: number;
	listings: number;
	pendingInvites: number;
};

const AUDIT_PAGE_SIZE = 50;
const RECENT_ACTIONS_LIMIT = 10;

function asJsonRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

async function attachAdminNames(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	rows: {
		id: string;
		admin_user_id: string | null;
		action: string;
		target_type: string;
		target_id: string | null;
		summary: string;
		old_values: unknown;
		new_values: unknown;
		created_at: string;
	}[]
): Promise<AuditLogRow[]> {
	const adminIds = [
		...new Set(
			rows
				.map(row => row.admin_user_id)
				.filter((id): id is string => typeof id === 'string' && id.length > 0)
		)
	];

	const { data: admins } = adminIds.length
		? await supabase.from('profiles').select('id, full_name').in('id', adminIds)
		: { data: [] as { id: string; full_name: string }[] };

	const nameById = new Map((admins ?? []).map(row => [row.id, row.full_name]));

	return rows.map(row => ({
		id: row.id,
		adminUserId: row.admin_user_id,
		adminName: row.admin_user_id
			? (nameById.get(row.admin_user_id) ?? null)
			: null,
		action: row.action,
		targetType: row.target_type,
		targetId: row.target_id,
		summary: row.summary,
		oldValues: asJsonRecord(row.old_values),
		newValues: asJsonRecord(row.new_values),
		createdAt: row.created_at
	}));
}

export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
	const { supabase } = await requireAdmin();

	const [usersRes, adminsRes, listingsRes, invitesRes] = await Promise.all([
		supabase.from('profiles').select('id', { count: 'exact', head: true }),
		supabase
			.from('profiles')
			.select('id', { count: 'exact', head: true })
			.eq('role', 'admin'),
		supabase.from('listings').select('id', { count: 'exact', head: true }),
		supabase
			.from('user_invitations')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'pending')
	]);

	if (usersRes.error) throw new Error(usersRes.error.message);
	if (adminsRes.error) throw new Error(adminsRes.error.message);
	if (listingsRes.error) throw new Error(listingsRes.error.message);
	if (invitesRes.error) throw new Error(invitesRes.error.message);

	return {
		users: usersRes.count ?? 0,
		admins: adminsRes.count ?? 0,
		listings: listingsRes.count ?? 0,
		pendingInvites: invitesRes.count ?? 0
	};
}

export async function listRecentAuditActions(
	limit = RECENT_ACTIONS_LIMIT
): Promise<AuditLogRow[]> {
	const { supabase } = await requireAdmin();
	const { data, error } = await supabase
		.from('admin_audit_log')
		.select(
			'id, admin_user_id, action, target_type, target_id, summary, old_values, new_values, created_at'
		)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) {
		throw new Error(error.message);
	}

	return attachAdminNames(supabase, data ?? []);
}

export async function listAuditLog(opts?: {
	action?: string | null;
	targetType?: string | null;
	q?: string | null;
}): Promise<AuditLogRow[]> {
	const { supabase } = await requireAdmin();
	const action = opts?.action?.trim() || null;
	const targetType = opts?.targetType?.trim() || null;
	const q = opts?.q?.trim() || null;

	let query = supabase
		.from('admin_audit_log')
		.select(
			'id, admin_user_id, action, target_type, target_id, summary, old_values, new_values, created_at'
		)
		.order('created_at', { ascending: false })
		.limit(AUDIT_PAGE_SIZE);

	if (action && action !== 'all') {
		query = query.eq('action', action);
	}
	if (targetType && targetType !== 'all') {
		query = query.eq('target_type', targetType);
	}
	if (q) {
		query = query.ilike('summary', `%${q}%`);
	}

	const { data, error } = await query;
	if (error) {
		throw new Error(error.message);
	}

	return attachAdminNames(supabase, data ?? []);
}
