'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnalyticsEvents, useAnalytics } from '@/components/analytics/posthog-provider';

/**
 * Fires one-shot events from query flags set by server redirects
 * (login_success / invite_accepted), then strips the flag from the URL.
 */
export function AnalyticsWelcomeEvents() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();
	const { track, analyticsEnabled } = useAnalytics();
	const handled = useRef<string | null>(null);

	useEffect(() => {
		const welcome = searchParams.get('welcome');
		const invite = searchParams.get('invite');
		const key = `${welcome ?? ''}:${invite ?? ''}`;
		if (handled.current === key) return;

		if (welcome === '1' && analyticsEnabled) {
			handled.current = key;
			if (invite === '1') {
				track(AnalyticsEvents.INVITE_ACCEPTED);
			} else {
				track(AnalyticsEvents.LOGIN_SUCCESS);
			}
			const params = new URLSearchParams(searchParams.toString());
			params.delete('welcome');
			params.delete('invite');
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
			return;
		}

		if (welcome === '1' && !analyticsEnabled) {
			handled.current = key;
			const params = new URLSearchParams(searchParams.toString());
			params.delete('welcome');
			params.delete('invite');
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		}
	}, [searchParams, analyticsEnabled, track, pathname, router]);

	return null;
}
