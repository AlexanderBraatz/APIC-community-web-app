'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteListing } from '@/lib/listings/admin-actions';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';

export default function DeleteListingButton({
	id,
	name
}: {
	id: string;
	name: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function confirmDelete() {
		startTransition(async () => {
			setError(null);
			const result = await deleteListing(id);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setOpen(false);
			router.push(
				`/members/admin/listings?message=${encodeURIComponent('Listing deleted.')}`
			);
			router.refresh();
		});
	}

	return (
		<>
			<Button
				type="button"
				variant="outline"
				className="rounded-[2px]"
				onClick={() => setOpen(true)}
			>
				Delete
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Delete listing?</DialogTitle>
						<DialogDescription>
							This permanently removes “{name}” and its tag assignments. This
							cannot be undone.
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
							className="rounded-[2px]"
							onClick={() => setOpen(false)}
							disabled={pending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="rounded-[2px] border border-red-800 bg-red-700 text-white hover:bg-red-800"
							onClick={confirmDelete}
							disabled={pending}
						>
							{pending ? 'Deleting…' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
