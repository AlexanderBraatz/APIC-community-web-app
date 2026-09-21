'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
	APIC_ADMIN_EMAIL,
	authLinkErrorCopy,
	isExpiredAuthLinkError,
	resolveAuthLinkFlow,
	type AuthLinkErrorKind,
	type AuthLinkFlow
} from '@/lib/auth/link-errors';

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

function clearHashFromUrl() {
	window.history.replaceState(
		null,
		'',
		`${window.location.pathname}${window.location.search}`
	);
}

type ConfirmErrorState = {
	kind: AuthLinkErrorKind;
	flow: AuthLinkFlow;
};

function authErrorCode(error: unknown): string | null {
	if (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof (error as { code?: unknown }).code === 'string'
	) {
		return (error as { code: string }).code;
	}
	return null;
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
	const [statusMessage, setStatusMessage] = useState(
		'Confirming your email link…'
	);
	const [errorState, setErrorState] = useState<ConfirmErrorState | null>(null);

	useEffect(() => {
		let cancelled = false;

		function showError(kind: AuthLinkErrorKind, flow: AuthLinkFlow) {
			if (cancelled) return;
			setErrorState({ kind, flow });
			setStatusMessage('');
		}

		async function run() {
			const supabase = createClient();
			const next = safeNextPath(nextParam);
			const hashParams = readHashParams();
			const searchParams = new URLSearchParams(window.location.search);

			const hashType = hashParams.get('type');
			const flow = resolveAuthLinkFlow({
				type,
				hashType,
				next: nextParam
			});

			const errorCode =
				hashParams.get('error_code') || searchParams.get('error_code');
			const errorDescription =
				hashParams.get('error_description') ||
				searchParams.get('error_description');
			const hashError = hashParams.get('error') || searchParams.get('error');

			if (errorCode || errorDescription || hashError) {
				clearHashFromUrl();
				const expired = isExpiredAuthLinkError({
					errorCode,
					errorDescription,
					message: hashError
				});
				showError(expired ? 'expired' : 'generic', flow);
				return;
			}

			const accessToken = hashParams.get('access_token');
			const refreshToken = hashParams.get('refresh_token');

			try {
				if (accessToken && refreshToken) {
					const { error } = await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken
					});
					if (error) {
						throw error;
					}
					clearHashFromUrl();
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
				const message =
					error instanceof Error
						? error.message
						: 'Auth link is invalid or has expired.';
				const expired = isExpiredAuthLinkError({
					code: authErrorCode(error),
					message
				});
				showError(expired ? 'expired' : 'generic', flow);
			}
		}

		void run();
		return () => {
			cancelled = true;
		};
	}, [code, tokenHash, type, nextParam, router]);

	if (errorState) {
		const copy = authLinkErrorCopy(errorState.kind, errorState.flow);
		return (
			<main className="mx-auto flex min-h-[40vh] w-full max-w-md flex-col justify-center px-4 py-16">
				<h1 className="font-heading text-3xl text-[#805b32]">{copy.title}</h1>
				<p className="mt-3 text-sm text-[#666]" role="alert">
					{copy.body}
				</p>
				<p className="mt-6 text-sm">
					<a
						href={`mailto:${APIC_ADMIN_EMAIL}`}
						className="text-[#805b32] underline"
					>
						Contact APIC admins
					</a>
					{copy.showForgotPassword ? (
						<>
							{' · '}
							<Link
								href="/forgot-password"
								className="text-[#805b32] underline"
							>
								Request a new reset link
							</Link>
						</>
					) : null}
				</p>
				<p className="mt-4 text-sm">
					<Link href="/sign-in" className="text-[#805b32] underline">
						Back to sign in
					</Link>
				</p>
			</main>
		);
	}

	return (
		<main className="mx-auto flex min-h-[40vh] w-full max-w-md flex-col justify-center px-4 py-16">
			<p className="text-sm text-[#666]">{statusMessage}</p>
		</main>
	);
}
