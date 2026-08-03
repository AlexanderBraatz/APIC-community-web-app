'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeUserRole, deleteUser } from '@/lib/admin/users-actions';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';

type ConfirmKind = 'promote' | 'demote' | 'delete';

export default function UserRoleActions({
	userId,
	fullName,
	role,
	isSelf
}: {
	userId: string;
	fullName: string;
	role: 'user' | 'admin';
	isSelf: boolean;
}) {
	const router = useRouter();
	const [kind, setKind] = useState<ConfirmKind | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function runConfirm() {
		if (!kind) return;
		startTransition(async () => {
			setError(null);
			let result: { ok: true } | { ok: false; error: string };
			if (kind === 'promote') {
				result = await changeUserRole(userId, 'admin');
			} else if (kind === 'demote') {
				result = await changeUserRole(userId, 'user');
			} else {
				result = await deleteUser(userId);
			}

			if (!result.ok) {
				setError(result.error);
				return;
			}

			setKind(null);
			router.refresh();
		});
	}

	const title =
		kind === 'promote'
			? 'Promote to admin?'
			: kind === 'demote'
				? 'Demote to member?'
				: 'Delete user?';

	const description =
		kind === 'promote'
			? `“${fullName}” will get full app-admin access.`
			: kind === 'demote'
				? `“${fullName}” will lose admin access. The last remaining admin cannot be demoted.`
				: `Permanently remove “${fullName}”, their auth account, and attendance. Audit and invitation history are kept. This cannot be undone.`;

	return (
		<>
			<div className="flex flex-wrap gap-2">
				{role === 'user' ? (
					<Button
						type="button"
						variant="outline"
						className="rounded-[2px]"
						disabled={isSelf}
						onClick={() => setKind('promote')}
					>
						Promote
					</Button>
				) : (
					<Button
						type="button"
						variant="outline"
						className="rounded-[2px]"
						disabled={isSelf}
						onClick={() => setKind('demote')}
					>
						Demote
					</Button>
				)}
				<Button
					type="button"
					variant="outline"
					className="rounded-[2px]"
					disabled={isSelf}
					onClick={() => setKind('delete')}
				>
					Delete
				</Button>
			</div>

			<Dialog open={kind !== null} onOpenChange={open => !open && setKind(null)}>
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					{error ? (
						<p className="text-sm text-red-700" role="alert">
							{error}
						</p>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							disabled={pending}
							onClick={() => setKind(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className={
								kind === 'delete'
									? 'rounded-[2px] border border-red-800 bg-red-700 text-white hover:bg-red-800'
									: 'rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22]'
							}
							disabled={pending}
							onClick={runConfirm}
						>
							{pending
								? 'Working…'
								: kind === 'promote'
									? 'Promote'
									: kind === 'demote'
										? 'Demote'
										: 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
