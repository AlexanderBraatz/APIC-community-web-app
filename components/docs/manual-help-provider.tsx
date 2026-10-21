'use client';

import { usePathname } from 'next/navigation';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode
} from 'react';
import { HelpFab } from '@/components/docs/help-fab';
import { ManualHelpSheet } from '@/components/docs/manual-help-sheet';
import {
	getTinaAdminHash,
	resolveManualHelpTarget,
	type ManualHelpTarget,
	type ManualKind
} from '@/lib/docs/manual-help-targets';
import type { ManualLanguage } from '@/lib/docs/manual-language';

type ManualHelpContextValue = {
	openHelp: (target: ManualHelpTarget) => void;
	closeHelp: () => void;
};

const ManualHelpContext = createContext<ManualHelpContextValue | null>(null);

export function useManualHelp() {
	const ctx = useContext(ManualHelpContext);
	if (!ctx) {
		throw new Error('useManualHelp must be used within ManualHelpProvider');
	}
	return ctx;
}

type ManualHelpProviderProps = {
	children: ReactNode;
	/** Profile language for manuals; defaults to English when signed out. */
	language?: ManualLanguage;
	/** When true, Help sheet stacks admin + member manuals. */
	isAdmin?: boolean;
};

export function ManualHelpProvider({
	children,
	language = 'en',
	isAdmin = false
}: ManualHelpProviderProps) {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [target, setTarget] = useState<ManualHelpTarget | null>(null);
	const [markdownByKind, setMarkdownByKind] = useState<
		Partial<Record<ManualKind, string>>
	>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const cacheRef = useRef<Partial<Record<string, string>>>({});
	const pathForOpenTargetRef = useRef(pathname);
	const languageRef = useRef(language);

	const cacheKey = useCallback(
		(kind: ManualKind) => `${language}:${kind}`,
		[language]
	);

	const fetchKind = useCallback(
		async (kind: ManualKind): Promise<string> => {
			const key = cacheKey(kind);
			const cached = cacheRef.current[key];
			if (cached) return cached;

			const res = await fetch(`/api/user-manuals/${kind}`);
			if (!res.ok) {
				throw new Error('Could not load the manual.');
			}
			const text = await res.text();
			cacheRef.current[key] = text;
			return text;
		},
		[cacheKey]
	);

	const loadManuals = useCallback(
		async (kinds: ManualKind[]) => {
			const missing = kinds.filter(
				(kind) => !cacheRef.current[cacheKey(kind)]
			);

			if (missing.length === 0) {
				setMarkdownByKind((prev) => {
					const next = { ...prev };
					for (const kind of kinds) {
						const cached = cacheRef.current[cacheKey(kind)];
						if (cached) next[kind] = cached;
					}
					return next;
				});
				setError(null);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const results = await Promise.all(
					kinds.map(async (kind) => {
						const text = await fetchKind(kind);
						return [kind, text] as const;
					})
				);
				setMarkdownByKind((prev) => {
					const next = { ...prev };
					for (const [kind, text] of results) {
						next[kind] = text;
					}
					return next;
				});
			} catch {
				setError('Could not load the manual. Please try again.');
			} finally {
				setLoading(false);
			}
		},
		[cacheKey, fetchKind]
	);

	const kindsToLoad = useMemo((): ManualKind[] | null => {
		if (!open || !target) return null;
		if (isAdmin) return ['admin', 'member'];
		return [target.manual];
	}, [open, target, isAdmin]);

	// Drop cached manuals when language preference changes.
	useEffect(() => {
		if (languageRef.current === language) return;
		languageRef.current = language;
		cacheRef.current = {};
		setMarkdownByKind({});
	}, [language]);

	// Keep target in sync with the route while the sheet is open (same render as
	// pathname change so the sheet can seed from the new page's section).
	if (open && pathForOpenTargetRef.current !== pathname) {
		pathForOpenTargetRef.current = pathname;
		setTarget(
			resolveManualHelpTarget({
				pathname,
				tinaHash: getTinaAdminHash()
			})
		);
	} else if (!open) {
		pathForOpenTargetRef.current = pathname;
	}

	useEffect(() => {
		if (!kindsToLoad) return;
		void loadManuals(kindsToLoad);
	}, [kindsToLoad, loadManuals]);

	const openHelp = useCallback(
		(next: ManualHelpTarget) => {
			setTarget(next);
			setOpen(true);
			pathForOpenTargetRef.current = pathname;
			void loadManuals(isAdmin ? ['admin', 'member'] : [next.manual]);
		},
		[loadManuals, pathname, isAdmin]
	);

	const closeHelp = useCallback(() => {
		setOpen(false);
	}, []);

	const value = useMemo(
		() => ({ openHelp, closeHelp }),
		[openHelp, closeHelp]
	);

	const markdown =
		!isAdmin && target ? (markdownByKind[target.manual] ?? null) : null;

	return (
		<ManualHelpContext.Provider value={value}>
			{children}
			<ManualHelpSheet
				open={open}
				onOpenChange={setOpen}
				target={target}
				isAdmin={isAdmin}
				markdown={markdown}
				adminMarkdown={markdownByKind.admin ?? null}
				memberMarkdown={markdownByKind.member ?? null}
				loading={loading}
				error={error}
			/>
			<HelpFab
				sheetOpen={open}
				onCloseSheet={closeHelp}
				onOpenManual={openHelp}
			/>
		</ManualHelpContext.Provider>
	);
}
