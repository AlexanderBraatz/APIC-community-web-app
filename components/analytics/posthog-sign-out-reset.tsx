'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPostHog } from '@/lib/analytics/posthog';

/** Clears PostHog identity after sign-out redirect. */
export function PostHogSignOutReset() {
	const searchParams = useSearchParams();

	useEffect(() => {
		if (searchParams.get('signed_out') === '1') {
			resetPostHog();
		}
	}, [searchParams]);

	return null;
}
