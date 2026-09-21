'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isExpiredAuthLinkError } from '@/lib/auth/link-errors';

/**
 * Recover invite/recovery sessions when Supabase lands on any route with
 * tokens in the URL hash (common when Site URL is used as fallback).
 * Server routes cannot read the hash, so this must run in the browser.
 */
export default function HashSessionRecovery() {
	const router = useRouter();

	useEffect(() => {
		// /auth/confirm owns hash tokens and error UI; don't fight it.
		if (window.location.pathname.startsWith('/auth/confirm')) return;

		const hash = window.location.hash.startsWith('#')
			? window.location.hash.slice(1)
			: window.location.hash;
		if (!hash) return;

		const params = new URLSearchParams(hash);
		const errorCode = params.get('error_code');
		const errorDescription = params.get('error_description');
		const hashError = params.get('error');
		const type = params.get('type');

		if (errorCode || errorDescription || hashError) {
			if (
				isExpiredAuthLinkError({
					errorCode,
					errorDescription,
					message: hashError
				}) ||
				hashError
			) {
				const next =
					type === 'recovery'
						? '/reset-password'
						: type === 'invite'
							? '/accept-invite'
							: undefined;
				const confirmUrl = next
					? `/auth/confirm?next=${encodeURIComponent(next)}#${hash}`
					: `/auth/confirm#${hash}`;
				router.replace(confirmUrl);
			}
			return;
		}

		const accessToken = params.get('access_token');
		const refreshToken = params.get('refresh_token');

		if (!accessToken || !refreshToken) return;

		const supabase = createClient();
		void supabase.auth
			.setSession({
				access_token: accessToken,
				refresh_token: refreshToken
			})
			.then(({ error }) => {
				if (error) {
					const next =
						type === 'recovery'
							? '/reset-password'
							: type === 'invite'
								? '/accept-invite'
								: undefined;
					const confirmUrl = next
						? `/auth/confirm?next=${encodeURIComponent(next)}#${hash}`
						: `/auth/confirm#${hash}`;
					router.replace(confirmUrl);
					return;
				}
				window.history.replaceState(
					null,
					'',
					`${window.location.pathname}${window.location.search}`
				);
				if (type === 'invite') {
					router.replace('/accept-invite');
				} else if (type === 'recovery') {
					router.replace('/reset-password');
				} else {
					router.replace('/place');
				}
			});
	}, [router]);

	return null;
}
