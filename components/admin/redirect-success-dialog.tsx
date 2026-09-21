'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';

const LISTINGS_PATH = '/members/admin/listings';
const REDIRECT_DELAY_MS = 3000;

export default function RedirectSuccessDialog({
	open,
	title,
	href = LISTINGS_PATH,
	description = 'You are being redirected back to the listings page…'
}: {
	open: boolean;
	title: string;
	href?: string;
	description?: string;
}) {
	const router = useRouter();

	useEffect(() => {
		if (!open) return;
		const timer = window.setTimeout(() => {
			router.push(href, { scroll: true });
			router.refresh();
		}, REDIRECT_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [open, href, router]);

	return (
		<Dialog
			open={open}
			modal={false}
			disablePointerDismissal
			onOpenChange={() => {
				/* Keep open until redirect completes */
			}}
		>
			<DialogContent
				className="overflow-hidden sm:max-w-md"
				showCloseButton={false}
			>
				<DialogHeader className="-mx-4 -mt-4 rounded-t-xl border-b border-emerald-200/80 bg-emerald-50 px-4 py-5">
					<DialogTitle className="font-sans text-emerald-950">
						{title}
					</DialogTitle>
					<DialogDescription className="font-sans text-emerald-900/70">
						{description}
					</DialogDescription>
				</DialogHeader>
				<div
					className="flex items-center gap-3 py-1 font-sans"
					role="status"
					aria-live="polite"
				>
					<Loader2
						className="size-5 shrink-0 animate-spin text-[#805b32]"
						aria-hidden
					/>
					<span className="text-sm text-[#666]">Redirecting…</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}
