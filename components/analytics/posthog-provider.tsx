'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode
} from 'react';
import { usePathname } from 'next/navigation';
import {
	AnalyticsEvents,
	type AnalyticsEventName
} from '@/lib/analytics/events';
import {
	applyAnalyticsConsent,
	isPostHogConfigured,
	resetPostHog,
	syncSessionRecordingForPath,
	trackEvent,
	trackPageView
} from '@/lib/analytics/posthog';

type AnalyticsContextValue = {
	analyticsEnabled: boolean;
	sessionReplayEnabled: boolean;
	userId: string | null;
	setConsent: (next: {
		analyticsEnabled: boolean;
		sessionReplayEnabled: boolean;
	}) => void;
	track: (
		event: AnalyticsEventName | string,
		properties?: Record<string, string | number | boolean | null | undefined>
	) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export type PostHogProviderProps = {
	children: ReactNode;
	userId: string | null;
	role?: string | null;
	analyticsEnabled: boolean;
	sessionReplayEnabled: boolean;
};

type ConsentOverride = {
	analyticsEnabled: boolean;
	sessionReplayEnabled: boolean;
};

export function PostHogProvider({
	children,
	userId,
	role,
	analyticsEnabled: initialAnalytics,
	sessionReplayEnabled: initialReplay
}: PostHogProviderProps) {
	const pathname = usePathname();
	const propsKey = `${initialAnalytics}:${initialReplay}`;
	const [override, setOverride] = useState<ConsentOverride | null>(null);
	const [overridePropsKey, setOverridePropsKey] = useState(propsKey);

	if (overridePropsKey !== propsKey) {
		setOverridePropsKey(propsKey);
		setOverride(null);
	}

	const analyticsEnabled = override?.analyticsEnabled ?? initialAnalytics;
	const sessionReplayEnabled =
		override?.sessionReplayEnabled ?? initialReplay;

	useEffect(() => {
		if (!userId || !isPostHogConfigured()) {
			resetPostHog();
			return;
		}

		applyAnalyticsConsent({
			userId,
			role,
			analyticsEnabled,
			sessionReplayEnabled,
			pathname
		});
	}, [userId, role, analyticsEnabled, sessionReplayEnabled, pathname]);

	useEffect(() => {
		if (!userId || !sessionReplayEnabled) return;
		syncSessionRecordingForPath(pathname);
	}, [pathname, userId, sessionReplayEnabled]);

	useEffect(() => {
		if (!userId || !analyticsEnabled) return;
		trackPageView(pathname);
	}, [pathname, userId, analyticsEnabled]);

	const setConsent = useCallback(
		(next: { analyticsEnabled: boolean; sessionReplayEnabled: boolean }) => {
			setOverride(next);
			if (!userId || !isPostHogConfigured()) return;
			applyAnalyticsConsent({
				userId,
				role,
				analyticsEnabled: next.analyticsEnabled,
				sessionReplayEnabled: next.sessionReplayEnabled,
				pathname
			});
		},
		[userId, role, pathname]
	);

	const track = useCallback(
		(
			event: AnalyticsEventName | string,
			properties?: Record<
				string,
				string | number | boolean | null | undefined
			>
		) => {
			trackEvent(event, properties);
		},
		[]
	);

	const value = useMemo(
		() => ({
			analyticsEnabled,
			sessionReplayEnabled,
			userId,
			setConsent,
			track
		}),
		[analyticsEnabled, sessionReplayEnabled, userId, setConsent, track]
	);

	return (
		<AnalyticsContext.Provider value={value}>
			{children}
		</AnalyticsContext.Provider>
	);
}

export function useAnalytics() {
	const ctx = useContext(AnalyticsContext);
	if (!ctx) {
		return {
			analyticsEnabled: false,
			sessionReplayEnabled: false,
			userId: null,
			setConsent: () => {},
			track: () => {}
		} satisfies AnalyticsContextValue;
	}
	return ctx;
}

export { AnalyticsEvents };
