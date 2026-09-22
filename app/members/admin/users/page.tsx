import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requireAdmin } from '@/lib/admin/require-admin';
import AdminUsersList from '@/components/admin/admin-users-list';
import { listAdminUsers } from '@/lib/admin/users-actions';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

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
				<h2 className="text-xl font-medium text-[#444]">Members</h2>
				<p className="mt-1 text-sm text-[#666]">
					Members can sign in, browse recommendations, and share when they will
					be in Castelfalfi on the attendance calendar. Admins can also manage
					recommendations, invitations, and other members.
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
					className={cn(
						buttonVariants({ variant: 'default', size: 'lg' }),
						'group w-full justify-between sm:w-72'
					)}
				>
					<span>Go to invitations</span>
					<ArrowRight
						className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
						strokeWidth={1.75}
						aria-hidden
					/>
				</Link>
			</div>

			<AdminUsersList users={users} currentUserId={user.id} />
		</div>
	);
}
