'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { requestInviteOtp } from '@/lib/invitations/actions';
import { createClient } from '@/lib/supabase/client';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export function AcceptInviteOtpForm({
	initialError,
	initialEmail = ''
}: {
	initialError?: string;
	initialEmail?: string;
}) {
	const router = useRouter();
	const [email, setEmail] = useState(initialEmail);
	const [token, setToken] = useState('');
	const [error, setError] = useState(initialError ?? '');
	const [info, setInfo] = useState('');
	const [pending, startTransition] = useTransition();
	const [requestPending, startRequestTransition] = useTransition();

	function onVerify(formData: FormData) {
		setError('');
		setInfo('');
		const nextEmail = normalize(String(formData.get('email') ?? ''));
		const nextToken = String(formData.get('token') ?? '').trim();
		setEmail(nextEmail);
		setToken(nextToken);

		startTransition(async () => {
			if (!nextEmail.includes('@')) {
				setError('Enter a valid email address.');
				return;
			}
			if (!/^\d{6,10}$/.test(nextToken)) {
				setError('Enter the one-time code from your invitation email.');
				return;
			}

			const supabase = createClient();
			const { error: verifyError } = await supabase.auth.verifyOtp({
				email: nextEmail,
				token: nextToken,
				type: 'invite'
			});

			if (verifyError) {
				setError(
					verifyError.message ||
						'That code is invalid or expired. Request a new one below.'
				);
				return;
			}

			router.refresh();
		});
	}

	function onRequestNewCode() {
		setError('');
		setInfo('');
		const nextEmail = normalize(email);
		if (!nextEmail.includes('@')) {
			setError('Enter your email address first, then request a new code.');
			return;
		}

		startRequestTransition(async () => {
			const formData = new FormData();
			formData.set('email', nextEmail);
			const result = await requestInviteOtp(formData);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setToken('');
			setInfo('A new code has been sent. Check your email.');
		});
	}

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Accept invitation</h1>
			<p className="mt-3 text-sm text-[#666]">
				Enter the email you were invited with and the one-time code from your
				invitation. Codes expire after 24 hours — you can request a new one if
				needed.
			</p>

			{error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}
			{info ? (
				<p
					className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{info}
				</p>
			) : null}

			<form action={onVerify} className="mt-8 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="email"
						required
						value={email}
						onChange={event => setEmail(event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="token">One-time code</Label>
					<Input
						id="token"
						name="token"
						type="text"
						inputMode="numeric"
						autoComplete="one-time-code"
						pattern="[0-9]*"
						maxLength={10}
						required
						value={token}
						onChange={event => setToken(event.target.value)}
					/>
				</div>
				<SubmitButton className="w-full sm:w-auto" disabled={pending}>
					{pending ? 'Verifying…' : 'Continue'}
				</SubmitButton>
			</form>

			<div className="mt-6 space-y-3">
				<button
					type="button"
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'w-full sm:w-auto'
					)}
					disabled={requestPending || pending}
					onClick={onRequestNewCode}
				>
					{requestPending ? 'Sending…' : 'Request a new code'}
				</button>
				<p className="text-sm text-[#666]">
					Need a new code? Enter your invited email above, then request one. Only
					approved emails can receive a code.
				</p>
			</div>

			<p className="mt-8 text-sm">
				<Link href="/sign-in" className="text-[#805b32] underline">
					Already set a password? Sign in
				</Link>
			</p>
		</main>
	);
}

function normalize(value: string) {
	return value.trim().toLowerCase();
}
