'use client';

import { useEffect } from 'react';
import {
	AnalyticsEvents,
	useAnalytics
} from '@/components/analytics/posthog-provider';

/** Fires a one-shot analytics event when the wrapped page mounts (if consented). */
export function TrackOnce({
	event,
	properties
}: {
	event: (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
	properties?: Record<string, string | number | boolean | null | undefined>;
}) {
	const { track } = useAnalytics();

	useEffect(() => {
		track(event, properties);
		// Fire once per mount for this event name.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot
	}, [event, track]);

	return null;
}
