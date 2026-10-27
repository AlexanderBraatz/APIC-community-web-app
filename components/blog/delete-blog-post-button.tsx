'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { softDelete } from '@/lib/blog/admin-actions';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';

export default function DeleteBlogPostButton({
	id,
	title,
	size = 'sm',
	redirectHref = '/blog'
}: {
	id: string;
	title: string;
	size?: 'sm' | 'default' | 'icon-sm';
	redirectHref?: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function confirmDelete() {
		startTransition(async () => {
			setError(null);
			const result = await softDelete(id);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setOpen(false);
			router.push(redirectHref);
			router.refresh();
		});
	}

	const label = `Delete ${title}`;

	return (
		<>
			<Button
				type="button"
				size={size === 'icon-sm' ? 'icon-sm' : size}
				variant="destructive"
				aria-label={label}
				onClick={() => setOpen(true)}
			>
				{size === 'icon-sm' ? (
					<Trash2 className="size-3.5" aria-hidden />
				) : (
					<>
						<Trash2 className="size-3.5" aria-hidden />
						Delete
					</>
				)}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Delete article?</DialogTitle>
						<DialogDescription>
							This removes “{title}” from News, Events & Activities. It will no
							longer appear for members or in the admin list. This cannot be
							undone from the site.
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
							onClick={() => setOpen(false)}
							disabled={pending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={confirmDelete}
							loading={pending}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
