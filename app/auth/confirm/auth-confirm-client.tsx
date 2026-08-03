'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

function safeNextPath(next: string | null) {
	if (!next || !next.startsWith('/') || next.startsWith('//')) {
		return '/place';
	}
	return next;
}

function readHashParams() {
	if (typeof window === 'undefined') {
		return new URLSearchParams();
	}
	const hash = window.location.hash.startsWith('#')
		? window.location.hash.slice(1)
		: window.location.hash;
	return new URLSearchParams(hash);
}

export default function AuthConfirmClient({
	code,
	tokenHash,
	type,
	next: nextParam
}: {
	code: string | null;
	tokenHash: string | null;
	type: string | null;
	next: string | null;
}) {
	const router = useRouter();
	const [message, setMessage] = useState('Confirming your invitation…');

	useEffect(() => {
		let cancelled = false;

		async function run() {
			const supabase = createClient();
			const next = safeNextPath(nextParam);
			const hashParams = readHashParams();

			const accessToken = hashParams.get('access_token');
			const refreshToken = hashParams.get('refresh_token');
			const hashType = hashParams.get('type');

			try {
				if (accessToken && refreshToken) {
					const { error } = await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken
					});
					if (error) {
						throw error;
					}
					window.history.replaceState(
						null,
						'',
						`${window.location.pathname}${window.location.search}`
					);
					const destination = nextParam
						? safeNextPath(nextParam)
						: hashType === 'recovery'
							? '/reset-password'
							: hashType === 'invite'
								? '/accept-invite'
								: '/place';
					router.replace(destination);
					return;
				}

				if (code) {
					const { error } = await supabase.auth.exchangeCodeForSession(code);
					if (error) {
						throw error;
					}
					router.replace(next);
					return;
				}

				if (tokenHash && type) {
					const { error } = await supabase.auth.verifyOtp({
						type: type as EmailOtpType,
						token_hash: tokenHash
					});
					if (error) {
						throw error;
					}
					router.replace(next);
					return;
				}

				throw new Error('Auth link is invalid or has expired.');
			} catch (error) {
				if (cancelled) return;
				const text =
					error instanceof Error
						? error.message
						: 'Auth link is invalid or has expired.';
				setMessage(text);
				router.replace(`/sign-in?error=${encodeURIComponent(text)}`);
			}
		}

		void run();
		return () => {
			cancelled = true;
		};
	}, [code, tokenHash, type, nextParam, router]);

	return (
		<main className="mx-auto flex min-h-[40vh] w-full max-w-md flex-col justify-center px-4 py-16">
			<p className="text-sm text-[#666]">{message}</p>
		</main>
	);
}
