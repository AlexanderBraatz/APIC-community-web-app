import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/require-admin';
import AdminUsersList from '@/components/admin/admin-users-list';
import { listAdminUsers } from '@/lib/admin/users-actions';

export default async function AdminUsersPage({
	searchParams
}: {
	searchParams: Promise<{
		error?: string;
		message?: string;
	}>;
}) {
	const params = await searchParams;
	const { user } = await requireAdmin();
	const users = await listAdminUsers();

	return (
		<div className="space-y-8">
			<section>
				<h2 className="text-xl font-medium text-[#444]">Users</h2>
				<p className="mt-1 text-sm text-[#666]">
					Users are community members who can sign in, browse listings, and
					share when they will be in Castelfalfi on the attendance calendar.
					Admins can also manage listings, invitations, and other members.
				</p>
			</section>

			{params.error ? (
				<p
					className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}
			{params.message ? (
				<p
					className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{params.message}
				</p>
			) : null}

			<div className="space-y-2">
				<h3 className="text-sm font-medium text-[#444]">Invite a member</h3>
				<Link
					href="/members/admin/invitations"
					className="inline-flex h-8 items-center rounded-[2px] border border-[#634627] bg-[#805b32] px-3 text-sm font-medium text-white hover:bg-[#1f2d22]"
				>
					Go to invitations
				</Link>
			</div>

			<AdminUsersList users={users} currentUserId={user.id} />
		</div>
	);
}
