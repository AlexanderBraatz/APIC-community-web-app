'use client';

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode
} from 'react';
import { HelpFab } from '@/components/docs/help-fab';
import { ManualHelpSheet } from '@/components/docs/manual-help-sheet';
import type {
	ManualHelpTarget,
	ManualKind
} from '@/lib/docs/manual-help-targets';

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

export function ManualHelpProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [target, setTarget] = useState<ManualHelpTarget | null>(null);
	const [markdown, setMarkdown] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const cacheRef = useRef<Partial<Record<ManualKind, string>>>({});

	const loadManual = useCallback(async (kind: ManualKind) => {
		const cached = cacheRef.current[kind];
		if (cached) {
			setMarkdown(cached);
			setError(null);
			return;
		}

		setLoading(true);
		setError(null);
		setMarkdown(null);

		try {
			const res = await fetch(`/api/user-manuals/${kind}`);
			if (!res.ok) {
				throw new Error('Could not load the manual.');
			}
			const text = await res.text();
			cacheRef.current[kind] = text;
			setMarkdown(text);
		} catch {
			setError('Could not load the manual. Please try again.');
			setMarkdown(null);
		} finally {
			setLoading(false);
		}
	}, []);

	const openHelp = useCallback(
		(next: ManualHelpTarget) => {
			setTarget(next);
			setOpen(true);
			void loadManual(next.manual);
		},
		[loadManual]
	);

	const closeHelp = useCallback(() => {
		setOpen(false);
	}, []);

	const value = useMemo(
		() => ({ openHelp, closeHelp }),
		[openHelp, closeHelp]
	);

	return (
		<ManualHelpContext.Provider value={value}>
			{children}
			<ManualHelpSheet
				open={open}
				onOpenChange={setOpen}
				target={target}
				markdown={markdown}
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
