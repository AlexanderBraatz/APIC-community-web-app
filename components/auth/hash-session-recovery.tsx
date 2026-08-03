'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Recover invite/recovery sessions when Supabase landed on /sign-in with
 * tokens in the URL hash (server routes cannot read the hash).
 */
export default function HashSessionRecovery() {
	const router = useRouter();

	useEffect(() => {
		const hash = window.location.hash.startsWith('#')
			? window.location.hash.slice(1)
			: window.location.hash;
		if (!hash) return;

		const params = new URLSearchParams(hash);
		const accessToken = params.get('access_token');
		const refreshToken = params.get('refresh_token');
		const type = params.get('type');

		if (!accessToken || !refreshToken) return;

		const supabase = createClient();
		void supabase.auth
			.setSession({
				access_token: accessToken,
				refresh_token: refreshToken
			})
			.then(({ error }) => {
				if (error) return;
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
