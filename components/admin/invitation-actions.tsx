'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
	cancelInvitation,
	resendInvitation
} from '@/lib/invitations/actions';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';

type ConfirmKind = 'resend' | 'cancel';

export default function InvitationActions({
	invitationId,
	email
}: {
	invitationId: string;
	email: string;
}) {
	const router = useRouter();
	const [kind, setKind] = useState<ConfirmKind | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function runConfirm() {
		if (!kind) return;
		startTransition(async () => {
			setError(null);
			const result =
				kind === 'resend'
					? await resendInvitation(invitationId)
					: await cancelInvitation(invitationId);

			if (!result.ok) {
				setError(result.error);
				return;
			}

			setKind(null);
			router.refresh();
		});
	}

	return (
		<>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="secondary"
					onClick={() => setKind('resend')}
				>
					Resend
				</Button>
				<Button
					type="button"
					variant="secondary"
					onClick={() => setKind('cancel')}
				>
					Cancel
				</Button>
			</div>

			<Dialog open={kind !== null} onOpenChange={open => !open && setKind(null)}>
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>
							{kind === 'resend' ? 'Resend invitation?' : 'Cancel invitation?'}
						</DialogTitle>
						<DialogDescription>
							{kind === 'resend'
								? `Send another invitation email to “${email}”.`
								: `Cancel the pending invitation for “${email}”. They will no longer be able to accept it.`}
						</DialogDescription>
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
							disabled={pending}
							onClick={() => setKind(null)}
						>
							Back
						</Button>
						<Button
							type="button"
							variant={kind === 'cancel' ? 'destructive' : 'default'}
							loading={pending}
							onClick={runConfirm}
						>
							{kind === 'resend' ? 'Resend' : 'Cancel invitation'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
