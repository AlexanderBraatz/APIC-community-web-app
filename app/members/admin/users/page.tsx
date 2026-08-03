import { requireAdmin } from '@/lib/admin/require-admin';
import UserRoleActions from '@/components/admin/user-role-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listAdminUsers } from '@/lib/admin/users-actions';

function formatWhen(value: string | null) {
	if (!value) return '—';
	return new Date(value).toLocaleString();
}

export default async function AdminUsersPage({
	searchParams
}: {
	searchParams: Promise<{
		error?: string;
		message?: string;
		q?: string;
		role?: string;
	}>;
}) {
	const params = await searchParams;
	const { user } = await requireAdmin();
	const roleFilter =
		params.role === 'admin' || params.role === 'user' ? params.role : 'all';
	const users = await listAdminUsers({
		q: params.q,
		role: roleFilter
	});

	return (
		<div className="space-y-8">
			<section>
				<h2 className="text-xl font-medium text-[#444]">Users</h2>
				<p className="mt-1 text-sm text-[#666]">
					Search members, promote or demote admins, and delete accounts. The last
					admin cannot be demoted or deleted.
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

			<form className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<div className="w-full space-y-2 sm:max-w-xs">
					<Label htmlFor="q">Search</Label>
					<Input
						id="q"
						name="q"
						defaultValue={params.q ?? ''}
						placeholder="Name or email"
					/>
				</div>
				<div className="w-full space-y-2 sm:max-w-xs">
					<Label htmlFor="role">Role</Label>
					<select
						id="role"
						name="role"
						defaultValue={roleFilter}
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						<option value="all">All</option>
						<option value="admin">Admins</option>
						<option value="user">Members</option>
					</select>
				</div>
				<Button type="submit" variant="outline" className="rounded-[2px]">
					Filter
				</Button>
			</form>

			{users.length === 0 ? (
				<p className="text-sm text-[#888]">No users match.</p>
			) : (
				<ul className="divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
					{users.map(row => {
						const isSelf = row.id === user.id;
						return (
							<li
								key={row.id}
								className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0 text-sm">
									<p className="font-medium text-[#444]">
										{row.fullName}
										{isSelf ? (
											<span className="ml-2 text-xs font-normal text-[#888]">
												(you)
											</span>
										) : null}
									</p>
									<p className="truncate text-[#888]">{row.email ?? '—'}</p>
									<p className="text-[#888]">
										{row.role}
										{' · Joined '}
										{formatWhen(row.createdAt)}
										{' · Last sign-in '}
										{formatWhen(row.lastSignInAt)}
									</p>
								</div>
								<UserRoleActions
									userId={row.id}
									fullName={row.fullName}
									role={row.role}
									isSelf={isSelf}
								/>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
