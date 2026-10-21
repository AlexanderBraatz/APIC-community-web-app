'use client';

import { ArrowRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	type UIEvent as ReactUIEvent
} from 'react';

import { UserManualAccordion } from '@/components/docs/user-manual-accordion';
import { Button } from '@/components/ui/button';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '@/components/ui/accordion';
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle
} from '@/components/ui/sheet';
import type {
	ManualHelpTarget,
	ManualKind
} from '@/lib/docs/manual-help-targets';
import { parseUserManual } from '@/lib/docs/parse-user-manual';
import { cn } from '@/lib/utils';

const DEFAULT_WIDTH = 512;
const MIN_WIDTH = 280;
const WIDTH_STORAGE_KEY = 'manual-help-sheet-width';

function maxSheetWidth(viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280) {
	return Math.min(Math.floor(viewportWidth * 0.92), 900);
}

function clampWidth(width: number, viewportWidth?: number) {
	return Math.min(maxSheetWidth(viewportWidth), Math.max(MIN_WIDTH, Math.round(width)));
}

function readStoredWidth(): number {
	if (typeof window === 'undefined') return DEFAULT_WIDTH;
	try {
		const raw = localStorage.getItem(WIDTH_STORAGE_KEY);
		if (!raw) return DEFAULT_WIDTH;
		const parsed = Number(raw);
		if (!Number.isFinite(parsed)) return DEFAULT_WIDTH;
		return clampWidth(parsed);
	} catch {
		return DEFAULT_WIDTH;
	}
}

type ManualHelpSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	target: ManualHelpTarget | null;
	isAdmin?: boolean;
	/** Single-manual markdown (non-admin). */
	markdown: string | null;
	adminMarkdown?: string | null;
	memberMarkdown?: string | null;
	loading: boolean;
	error: string | null;
};

export function ManualHelpSheet({
	open,
	onOpenChange,
	target,
	isAdmin = false,
	markdown,
	adminMarkdown = null,
	memberMarkdown = null,
	loading,
	error
}: ManualHelpSheetProps) {
	const pathname = usePathname();
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [manualValue, setManualValue] = useState<string[]>([]);
	const [sectionByManual, setSectionByManual] = useState<
		Record<ManualKind, string[]>
	>({ admin: [], member: [] });
	const [itemByManual, setItemByManual] = useState<
		Record<ManualKind, string[]>
	>({ admin: [], member: [] });
	const dragStartXRef = useRef(0);
	const dragStartWidthRef = useRef(DEFAULT_WIDTH);
	const bodyRef = useRef<HTMLDivElement>(null);
	const scrollTopRef = useRef(0);
	const seededForPathRef = useRef<string | null>(null);
	const restoringScrollRef = useRef(false);

	const contentReady = isAdmin
		? Boolean(adminMarkdown && memberMarkdown)
		: Boolean(markdown);

	useEffect(() => {
		setWidth(readStoredWidth());
	}, []);

	useEffect(() => {
		function onViewportResize() {
			setWidth(prev => clampWidth(prev));
		}
		window.addEventListener('resize', onViewportResize);
		return () => window.removeEventListener('resize', onViewportResize);
	}, []);

	// Reset session UI when the user navigates to another page.
	useEffect(() => {
		seededForPathRef.current = null;
		setManualValue([]);
		setSectionByManual({ admin: [], member: [] });
		setItemByManual({ admin: [], member: [] });
		scrollTopRef.current = 0;
		if (bodyRef.current) {
			bodyRef.current.scrollTop = 0;
		}
	}, [pathname]);

	// Seed accordion from the route target once per pathname (on open).
	useEffect(() => {
		if (!open || !target) return;
		if (seededForPathRef.current === pathname) return;
		seededForPathRef.current = pathname;
		setManualValue([target.manual]);
		setSectionByManual({
			admin: target.manual === 'admin' && target.section ? [target.section] : [],
			member:
				target.manual === 'member' && target.section ? [target.section] : []
		});
		setItemByManual({
			admin: target.manual === 'admin' && target.item ? [target.item] : [],
			member: target.manual === 'member' && target.item ? [target.item] : []
		});
		scrollTopRef.current = 0;
	}, [open, target, pathname]);

	const persistWidth = useCallback((next: number) => {
		try {
			localStorage.setItem(WIDTH_STORAGE_KEY, String(next));
		} catch {
			// ignore quota / private mode
		}
	}, []);

	function captureScroll() {
		const el = bodyRef.current;
		if (!el || restoringScrollRef.current) return;
		scrollTopRef.current = el.scrollTop;
	}

	function onBodyScroll(event: ReactUIEvent<HTMLDivElement>) {
		if (restoringScrollRef.current) return;
		scrollTopRef.current = event.currentTarget.scrollTop;
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			captureScroll();
		}
		onOpenChange(nextOpen);
	}

	function setSectionsFor(kind: ManualKind) {
		return (value: string[]) => {
			setSectionByManual((prev) => ({ ...prev, [kind]: value }));
		};
	}

	function setItemsFor(kind: ManualKind) {
		return (value: string[]) => {
			setItemByManual((prev) => ({ ...prev, [kind]: value }));
		};
	}

	// FAB `closeHelp` sets `open` without going through handleOpenChange. Prefer
	// an in-DOM position when still available; never overwrite a saved offset
	// with 0 after the drawer has already reset scroll.
	useLayoutEffect(() => {
		if (open) return;
		const el = bodyRef.current;
		if (!el || restoringScrollRef.current) return;
		if (el.scrollTop > 0) {
			scrollTopRef.current = el.scrollTop;
		}
	}, [open]);

	// Restore scroll on reopen. The drawer remounts SheetBody (ref may be null
	// briefly), and accordion height grows after paint — wait for the body, then
	// keep re-applying until layout settles. Ignore onScroll while restoring so
	// a clamped 0 does not wipe the saved position.
	useEffect(() => {
		if (!open || loading || !contentReady) return;
		const targetTop = scrollTopRef.current;
		if (targetTop <= 0) return;

		let cancelled = false;
		let observer: ResizeObserver | null = null;
		let doneTimer: ReturnType<typeof setTimeout> | undefined;
		let attachTimer: ReturnType<typeof setInterval> | undefined;
		restoringScrollRef.current = true;

		function apply() {
			const el = bodyRef.current;
			if (!el || cancelled) return;
			el.scrollTop = targetTop;
		}

		function start(el: HTMLDivElement) {
			apply();
			if (typeof ResizeObserver !== 'undefined') {
				observer = new ResizeObserver(apply);
				observer.observe(el);
				if (el.firstElementChild) {
					observer.observe(el.firstElementChild);
				}
			}
			requestAnimationFrame(() => {
				apply();
				requestAnimationFrame(apply);
			});
			doneTimer = setTimeout(() => {
				observer?.disconnect();
				observer = null;
				if (!cancelled) restoringScrollRef.current = false;
			}, 700);
		}

		const existing = bodyRef.current;
		if (existing) {
			start(existing);
		} else {
			attachTimer = setInterval(() => {
				const el = bodyRef.current;
				if (!el) return;
				if (attachTimer) clearInterval(attachTimer);
				attachTimer = undefined;
				start(el);
			}, 16);
		}

		return () => {
			cancelled = true;
			if (attachTimer) clearInterval(attachTimer);
			if (doneTimer) clearTimeout(doneTimer);
			observer?.disconnect();
			restoringScrollRef.current = false;
		};
	}, [open, loading, contentReady]);

	function onResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragStartXRef.current = event.clientX;
		dragStartWidthRef.current = width;
	}

	function onResizePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
		if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
		event.preventDefault();
		event.stopPropagation();
		// Sheet is docked on the right; dragging the left edge leftward widens it.
		const deltaX = dragStartXRef.current - event.clientX;
		setWidth(clampWidth(dragStartWidthRef.current + deltaX));
	}

	function onResizePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
		if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
		event.currentTarget.releasePointerCapture(event.pointerId);
		setWidth(prev => {
			const next = clampWidth(prev);
			persistWidth(next);
			return next;
		});
	}

	function onResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
		const step = event.shiftKey ? 48 : 24;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			setWidth(prev => {
				const next = clampWidth(prev + step);
				persistWidth(next);
				return next;
			});
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			setWidth(prev => {
				const next = clampWidth(prev - step);
				persistWidth(next);
				return next;
			});
		}
	}

	const adminTitle = adminMarkdown
		? parseUserManual(adminMarkdown).title || 'Admin Manual'
		: 'Admin Manual';
	const memberTitle = memberMarkdown
		? parseUserManual(memberMarkdown).title || 'Member Manual'
		: 'Member Manual';

	return (
		<Sheet
			open={open}
			onOpenChange={handleOpenChange}
			swipeDirection="right"
			modal={false}
			disablePointerDismissal
		>
			<SheetContent
				showOverlay={false}
				showCloseButton={false}
				className="max-w-none after:pointer-events-none after:absolute after:top-0 after:left-full after:h-full after:w-screen after:bg-white after:content-['']"
				style={{ width }}
			>
				<div
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize help panel"
					aria-valuemin={MIN_WIDTH}
					aria-valuemax={maxSheetWidth()}
					aria-valuenow={width}
					tabIndex={0}
					className={cn(
						'group absolute top-0 left-0 z-10 flex h-full w-3 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center',
						'outline-none focus-visible:ring-2 focus-visible:ring-[#805b32] focus-visible:ring-offset-2'
					)}
					onPointerDown={onResizePointerDown}
					onPointerMove={onResizePointerMove}
					onPointerUp={onResizePointerUp}
					onPointerCancel={onResizePointerUp}
					onKeyDown={onResizeKeyDown}
				>
					<span
						aria-hidden
						className="h-12 w-1 rounded-full bg-[#c4b5a5] transition-colors group-hover:bg-[#805b32] group-focus-visible:bg-[#805b32]"
					/>
				</div>
				<SheetHeader className="flex-row items-center justify-between gap-3 pr-5">
					<SheetTitle>Help</SheetTitle>
					<SheetClose
						render={
							<Button variant="secondary" size="sm" className="gap-1.5" />
						}
					>
						Close
						<ArrowRight className="size-3.5" aria-hidden />
					</SheetClose>
				</SheetHeader>
				<SheetBody ref={bodyRef} onScroll={onBodyScroll}>
					{loading ? (
						<p className="text-sm text-[#666]">Loading manual…</p>
					) : null}
					{error ? (
						<p className="text-sm text-red-700">{error}</p>
					) : null}
					{!loading && !error && contentReady ? (
						isAdmin && adminMarkdown && memberMarkdown ? (
							<Accordion
								value={manualValue}
								onValueChange={setManualValue}
							>
								<AccordionItem value="admin">
									<AccordionTrigger className="font-heading text-2xl text-[#805b32] hover:no-underline">
										{adminTitle}
									</AccordionTrigger>
									<AccordionContent>
										<UserManualAccordion
											markdown={adminMarkdown}
											sectionValue={sectionByManual.admin}
											onSectionValueChange={setSectionsFor('admin')}
											itemValue={itemByManual.admin}
											onItemValueChange={setItemsFor('admin')}
											manualKind="admin"
											compact
											hideTitle
										/>
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="member">
									<AccordionTrigger className="font-heading text-2xl text-[#805b32] hover:no-underline">
										{memberTitle}
									</AccordionTrigger>
									<AccordionContent>
										<UserManualAccordion
											markdown={memberMarkdown}
											sectionValue={sectionByManual.member}
											onSectionValueChange={setSectionsFor('member')}
											itemValue={itemByManual.member}
											onItemValueChange={setItemsFor('member')}
											manualKind="member"
											compact
											hideTitle
										/>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						) : markdown ? (
							<UserManualAccordion
								key={target?.manual ?? 'member'}
								markdown={markdown}
								sectionValue={
									sectionByManual[target?.manual ?? 'member']
								}
								onSectionValueChange={setSectionsFor(
									target?.manual ?? 'member'
								)}
								itemValue={itemByManual[target?.manual ?? 'member']}
								onItemValueChange={setItemsFor(
									target?.manual ?? 'member'
								)}
								manualKind={target?.manual ?? 'member'}
								compact
							/>
						) : null
					) : null}
				</SheetBody>
			</SheetContent>
		</Sheet>
	);
}
