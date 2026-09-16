'use client';

import { useDeferredValue, useState } from 'react';
import UserRoleActions from '@/components/admin/user-role-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminUserRow } from '@/lib/admin/users-actions';

function formatWhen(value: string | null) {
	if (!value) return '—';
	return new Date(value).toLocaleString();
}

function matchesQuery(user: AdminUserRow, q: string) {
	return (
		user.fullName.toLowerCase().includes(q) ||
		user.email?.toLowerCase().includes(q) ||
		user.role.toLowerCase().includes(q)
	);
}

export default function AdminUsersList({
	users,
	currentUserId
}: {
	users: AdminUserRow[];
	currentUserId: string;
}) {
	const [query, setQuery] = useState('');
	const deferredQuery = useDeferredValue(query);
	const q = deferredQuery.trim().toLowerCase();
	const filtered = q ? users.filter(user => matchesQuery(user, q)) : users;

	return (
		<div className="space-y-4">
			<div className="w-full space-y-2 sm:max-w-xs">
				<Label htmlFor="q">Search existing Members</Label>
				<Input
					id="q"
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder="Name or email"
					autoComplete="off"
				/>
			</div>

			{filtered.length === 0 ? (
				<p className="text-sm text-[#888]">No members match.</p>
			) : (
				<ul className="divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
					{filtered.map(row => {
						const isSelf = row.id === currentUserId;
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
										{row.role === 'admin' ? 'Admin' : 'Member'}
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
