'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilePenLine, Pencil } from 'lucide-react';
import DeleteBlogPostButton from '@/components/blog/delete-blog-post-button';
import { Button, buttonVariants } from '@/components/ui/button';
import { publish, turnBackToDraft } from '@/lib/blog/admin-actions';
import type { BlogPostStatus } from '@/lib/blog/types';
import { cn } from '@/lib/utils';

export default function BlogPostAdminActions({
	postId,
	title,
	status,
	compact = false,
	/** Index cards: Edit + Delete only. Detail: also Turn to draft / Publish. */
	includeStatusActions = true
}: {
	postId: string;
	title: string;
	status: BlogPostStatus;
	compact?: boolean;
	includeStatusActions?: boolean;
}) {
	const router = useRouter();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const size = compact ? 'sm' : 'default';

	function runTurnBackToDraft() {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			const result = await turnBackToDraft(postId);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setMessage('Article turned back into a draft.');
			router.refresh();
		});
	}

	function runPublish() {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			const result = await publish(postId);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setMessage('Article published.');
			router.refresh();
		});
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<Link
					href={`/members/admin/blog/${postId}`}
					className={cn(
						buttonVariants({ variant: 'secondary', size }),
						'gap-1.5'
					)}
				>
					<Pencil className="size-3.5" aria-hidden />
					Edit
				</Link>
				{includeStatusActions && status === 'published' ? (
					<Button
						type="button"
						variant="outline"
						size={size}
						className="gap-1.5"
						onClick={runTurnBackToDraft}
						loading={pending}
						disabled={pending}
					>
						<FilePenLine className="size-3.5" aria-hidden />
						Turn back into Draft
					</Button>
				) : null}
				{includeStatusActions && status === 'draft' ? (
					<Button
						type="button"
						size={size}
						className="border-emerald-800 bg-emerald-700 text-white hover:border-emerald-900 hover:bg-emerald-800"
						onClick={runPublish}
						loading={pending}
						disabled={pending}
					>
						Publish
					</Button>
				) : null}
				<DeleteBlogPostButton
					id={postId}
					title={title}
					size={size}
				/>
			</div>
			{error ? (
				<p className="font-sans text-sm text-red-700" role="alert">
					{error}
				</p>
			) : null}
			{message ? (
				<p className="font-sans text-sm text-emerald-800" role="status">
					{message}
				</p>
			) : null}
		</div>
	);
}
