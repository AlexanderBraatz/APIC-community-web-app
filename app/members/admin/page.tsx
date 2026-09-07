import Link from 'next/link';
import {
	getAdminDashboardCounts,
	listRecentAuditActions
} from '@/lib/admin/audit-actions';
import AuditDetailDialog from '@/components/admin/audit-detail-dialog';

function formatWhen(value: string) {
	return new Date(value).toLocaleString();
}

export default async function MembersAdminDashboardPage() {
	const [counts, recent] = await Promise.all([
		getAdminDashboardCounts(),
		listRecentAuditActions()
	]);

	const tiles = [
		{
			label: 'Users',
			value: counts.users,
			href: '/members/admin/users'
		},
		{
			label: 'Admins',
			value: counts.admins,
			href: '/members/admin/users?role=admin'
		},
		{
			label: 'Listings',
			value: counts.listings,
			href: '/members/admin/listings'
		},
		{
			label: 'Pending invites',
			value: counts.pendingInvites,
			href: '/members/admin/invitations'
		}
	];

	return (
		<div className="space-y-10">
			<section>
				<h2 className="text-xl font-medium text-[#444]">Dashboard</h2>
				<p className="mt-1 text-sm text-[#666]">
					Operational overview for membership, places, and recent admin
					actions.
				</p>
			</section>

			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{tiles.map(tile => (
					<Link
						key={tile.label}
						href={tile.href}
						className="border border-[#e5e5e5] px-4 py-5 transition-colors hover:border-[#805b32]"
					>
						<p className="text-xs tracking-wide text-[#888] uppercase">
							{tile.label}
						</p>
						<p className="mt-2 font-heading text-3xl text-[#805b32]">
							{tile.value}
						</p>
					</Link>
				))}
			</section>

			<section>
				<div className="flex items-end justify-between gap-4">
					<div>
						<h3 className="text-lg font-medium text-[#444]">Recent actions</h3>
						<p className="mt-1 text-sm text-[#666]">
							Latest entries from the admin audit log.
						</p>
					</div>
					<Link
						href="/members/admin/audit-log"
						className="text-sm text-[#805b32] underline"
					>
						View full audit log
					</Link>
				</div>

				{recent.length === 0 ? (
					<p className="mt-4 text-sm text-[#888]">No audit entries yet.</p>
				) : (
					<ul className="mt-4 divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
						{recent.map(row => (
							<li
								key={row.id}
								className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0 text-sm">
									<p className="font-medium text-[#444]">{row.summary}</p>
									<p className="text-[#888]">
										{row.action}
										{' · '}
										{row.adminName ?? 'deleted admin'}
										{' · '}
										{formatWhen(row.createdAt)}
									</p>
								</div>
								<AuditDetailDialog row={row} />
							</li>
						))}
					</ul>
				)}
			</section>

			<section>
				<h3 className="text-lg font-medium text-[#444]">Shortcuts</h3>
				<ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
					<li>
						<Link
							href="/members/admin/listings/new"
							className="text-[#805b32] underline"
						>
							New listing
						</Link>
					</li>
					<li>
						<Link
							href="/members/admin/invitations"
							className="text-[#805b32] underline"
						>
							Invite member
						</Link>
					</li>
					<li>
						<Link
							href="/members/admin/users"
							className="text-[#805b32] underline"
						>
							Manage users
						</Link>
					</li>
					<li>
						<Link
							href="/members/admin/tags"
							className="text-[#805b32] underline"
						>
							Manage tags
						</Link>
					</li>
					<li>
						<Link
							href="/members/admin/audit-log"
							className="text-[#805b32] underline"
						>
							Browse audit log
						</Link>
					</li>
				</ul>
			</section>
		</div>
	);
}
