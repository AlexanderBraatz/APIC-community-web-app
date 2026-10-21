'use client';

import * as Sentry from '@sentry/nextjs';
import { CircleHelp, FileText, Megaphone, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WELCOME_PAGE_COPY } from '@/components/account/welcome-page-copy';
import {
	getTinaAdminHash,
	resolveManualHelpTarget,
	type ManualHelpTarget
} from '@/lib/docs/manual-help-targets';
import {
	dismissHelpFabHint,
	HELP_FAB_HINT_CLEARED_EVENT,
	isHelpFabHintDismissed,
	isHelpFabHintRoute
} from '@/lib/docs/help-fab-hint';
import type { ManualLanguage } from '@/lib/docs/manual-language';
import { isSentryConfigured } from '@/lib/sentry/options';
import { cn } from '@/lib/utils';

const fabBaseClass =
	'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[#634627] bg-[#805b32] text-white shadow-md transition-colors hover:bg-[#1f2d22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#805b32] focus-visible:ring-offset-2';

type HelpFabProps = {
	sheetOpen: boolean;
	onCloseSheet: () => void;
	onOpenManual: (target: ManualHelpTarget) => void;
	language?: ManualLanguage;
	/** When false, coach mark is permanently off (account preference). */
	hintEnabled?: boolean;
};

export function HelpFab({
	sheetOpen,
	onCloseSheet,
	onOpenManual,
	language = 'en',
	hintEnabled = true
}: HelpFabProps) {
	const pathname = usePathname();
	const [expanded, setExpanded] = useState(false);
	/** Bumps when sessionStorage dismiss flag is written or cleared so render re-reads it. */
	const [hintStorageEpoch, setHintStorageEpoch] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);
	const canReport = isSentryConfigured();
	const showClose = sheetOpen || expanded;
	const onHintRoute = isHelpFabHintRoute(pathname);

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

	function dismissHint() {
		dismissHelpFabHint();
		setHintStorageEpoch(n => n + 1);
	}

	function handleMainClick() {
		dismissHint();
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

	useEffect(() => {
		function onHintCleared() {
			setHintStorageEpoch(n => n + 1);
		}

		window.addEventListener(HELP_FAB_HINT_CLEARED_EVENT, onHintCleared);
		return () => {
			window.removeEventListener(HELP_FAB_HINT_CLEARED_EVENT, onHintCleared);
		};
	}, []);

	if (!mounted) return null;

	// hintStorageEpoch ties re-renders to sessionStorage writes/clears.
	const showHint =
		hintEnabled &&
		hintStorageEpoch >= 0 &&
		onHintRoute &&
		!isHelpFabHintDismissed() &&
		!sheetOpen;
	const copy = WELCOME_PAGE_COPY[language];
	const hintCopy = copy.helpFabHint;

	// Portal to body so we stack above Base UI sheet portals. The app root uses
	// `isolate`, which would otherwise trap z-60 below the sheet.
	return createPortal(
		<>
			{showHint ? (
				<div
					role="status"
					className="pointer-events-none fixed right-4 bottom-[220px] z-70 max-w-[14rem] animate-in rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 fade-in-0 fill-mode-both duration-300"
				>
					<button
						type="button"
						onClick={dismissHint}
						aria-label="Dismiss help hint"
						className="pointer-events-auto absolute top-1 right-1 inline-flex size-5 cursor-pointer items-center justify-center rounded-sm text-amber-900/70 transition-colors hover:bg-amber-100 hover:text-amber-950"
					>
						<X
							className="size-3.5"
							aria-hidden
						/>
					</button>
					<p>{hintCopy}</p>
				</div>
			) : null}
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
								{copy.reportProblem}
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
							{copy.readUserManual}
						</button>
					</div>
				) : null}

				<div className="relative size-12">
					{showHint ? (
						<>
							<span
								aria-hidden
								className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
							>
								<span className="block size-[720px] animate-in rounded-full bg-[radial-gradient(circle,rgb(128_91_50_/_0.25)_20%,rgb(128_91_50_/_0)_70%)] fade-in-0 fill-mode-both duration-300" />
							</span>
							<span
								aria-hidden
								className="pointer-events-none absolute top-2 left-4 z-10 origin-right -translate-x-full -translate-y-1/2 rotate-60 opacity-90"
							>
								<svg
									className="animate-in fade-in-0 fill-mode-both duration-300"
									width="112"
									height="40"
									viewBox="32 0 112 40"
									fill="none"
								>
									<line
										x1="36"
										y1="20"
										x2="112"
										y2="20"
										stroke="#1f2d22"
										strokeWidth="12"
										strokeLinecap="round"
									/>
									<path
										d="M96 0 L128 20 L96 40 Z"
										fill="#1f2d22"
									/>
								</svg>
							</span>
						</>
					) : null}
					<button
						type="button"
						aria-label={
							sheetOpen
								? 'Close help'
								: expanded
								? 'Close help menu'
								: 'Need help?'
						}
						aria-expanded={expanded}
						aria-haspopup={sheetOpen ? undefined : 'menu'}
						onClick={handleMainClick}
						className={cn(
							fabBaseClass,
							'pointer-events-auto relative z-10 size-12',
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
				</div>
			</div>
		</>,
		document.body
	);
}
