'use client';

import * as Sentry from '@sentry/nextjs';
import { CircleHelp, FileText, Megaphone, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	getTinaAdminHash,
	resolveManualHelpTarget,
	type ManualHelpTarget
} from '@/lib/docs/manual-help-targets';
import { isSentryConfigured } from '@/lib/sentry/options';
import { cn } from '@/lib/utils';

const fabBaseClass =
	'inline-flex items-center justify-center gap-2 rounded-full border border-[#634627] bg-[#805b32] text-white shadow-md transition-colors hover:bg-[#1f2d22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#805b32] focus-visible:ring-offset-2';

type HelpFabProps = {
	sheetOpen: boolean;
	onCloseSheet: () => void;
	onOpenManual: (target: ManualHelpTarget) => void;
};

export function HelpFab({
	sheetOpen,
	onCloseSheet,
	onOpenManual
}: HelpFabProps) {
	const pathname = usePathname();
	const [expanded, setExpanded] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const canReport = isSentryConfigured();
	const showClose = sheetOpen || expanded;

	const collapse = useEffectEvent(() => {
		setExpanded(false);
	});

	useEffect(() => {
		if (sheetOpen) {
			collapse();
		}
	}, [sheetOpen]);

	useEffect(() => {
		if (!expanded) return;

		function onPointerDown(event: PointerEvent) {
			const root = rootRef.current;
			if (!root) return;
			if (event.target instanceof Node && !root.contains(event.target)) {
				collapse();
			}
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				collapse();
			}
		}

		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [expanded]);

	async function handleReportProblem() {
		collapse();
		const feedback = Sentry.getFeedback();
		const form = await feedback?.createForm();
		form?.appendToDom();
		form?.open();
	}

	function handleReadManual() {
		collapse();
		onOpenManual(
			resolveManualHelpTarget({
				pathname,
				tinaHash: getTinaAdminHash()
			})
		);
	}

	function handleMainClick() {
		if (sheetOpen) {
			onCloseSheet();
			return;
		}
		setExpanded(open => !open);
	}

	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	// Portal to body so we stack above Base UI sheet portals. The app root uses
	// `isolate`, which would otherwise trap z-60 below the sheet.
	return createPortal(
		<div
			ref={rootRef}
			className="pointer-events-none fixed right-4 bottom-16 z-60 flex flex-col items-end gap-2"
		>
			{expanded && !sheetOpen ? (
				<div className="pointer-events-auto flex w-max flex-col gap-2">
					{canReport ? (
						<button
							type="button"
							onClick={() => void handleReportProblem()}
							className={cn(
								fabBaseClass,
								'h-11 w-full animate-in px-4 text-sm font-medium fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-200 delay-50'
							)}
						>
							<Megaphone
								className="size-4 shrink-0"
								aria-hidden
							/>
							Report a problem
						</button>
					) : null}
					<button
						type="button"
						onClick={handleReadManual}
						className={cn(
							fabBaseClass,
							'h-11 w-full animate-in px-4 text-sm font-medium fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-200'
						)}
					>
						<FileText
							className="size-4 shrink-0"
							aria-hidden
						/>
						Read user manual
					</button>
				</div>
			) : null}

			<button
				type="button"
				aria-label={
					sheetOpen ? 'Close help' : expanded ? 'Close help menu' : 'Need help?'
				}
				aria-expanded={expanded}
				aria-haspopup={sheetOpen ? undefined : 'menu'}
				onClick={handleMainClick}
				className={cn(
					fabBaseClass,
					'pointer-events-auto size-12',
					sheetOpen &&
						'border-[#d4a05a] bg-[#f7bc74] text-black hover:bg-[#f0a84f]'
				)}
			>
				{showClose ? (
					<X
						className="size-6"
						aria-hidden
					/>
				) : (
					<CircleHelp
						className="size-6"
						aria-hidden
					/>
				)}
			</button>
		</div>,
		document.body
	);
}
