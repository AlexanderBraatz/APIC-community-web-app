'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordVerifyForm({
	email,
	initialSent = false
}: {
	email: string;
	initialSent?: boolean;
}) {
	const router = useRouter();
	const [token, setToken] = useState('');
	const [error, setError] = useState('');
	const [info] = useState(
		initialSent
			? 'If that email is registered, a one-time code is on its way. Check your inbox, then enter the code below.'
			: ''
	);
	const [pending, startTransition] = useTransition();
	const backHref = `/forgot-password?email=${encodeURIComponent(email)}`;

	function onVerify(formData: FormData) {
		setError('');
		const nextToken = digitsOnly(String(formData.get('token') ?? ''));
		setToken(formatTokenDisplay(nextToken));

		startTransition(async () => {
			if (!/^\d{8}$/.test(nextToken)) {
				setError(
					'Enter the 8-digit code from your email. If it looks wrong, go back and check the email address you provided.'
				);
				return;
			}

			const supabase = createClient();
			const { error: verifyError } = await supabase.auth.verifyOtp({
				email,
				token: nextToken,
				type: 'recovery'
			});

			if (verifyError) {
				setError(
					'That code is invalid or expired. Go back and check the email address you provided, then request a new code.'
				);
				return;
			}

			router.replace('/reset-password');
		});
	}

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Enter your code</h1>
			<p className="mt-3 text-sm text-[#666]">
				We sent a one-time code to{' '}
				<span className="font-medium text-[#444]">{email}</span>. Enter it below
				to continue.
			</p>

			{error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}
			{info && !error ? (
				<p
					className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{info}
				</p>
			) : null}

			<form action={onVerify} className="mt-8 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="token">One-time code</Label>
					<div className="flex justify-center">
						<Input
							id="token"
							name="token"
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							autoFocus
							required
							placeholder="_ _ _ _ _ _ _ _"
							maxLength={15}
							value={token}
							onChange={event =>
								setToken(formatTokenDisplay(digitsOnly(event.target.value)))
							}
							className="max-w-56 text-center font-mono text-lg tracking-[0.2em]"
						/>
					</div>
				</div>
				<SubmitButton className="w-full" disabled={pending}>
					{pending ? 'Verifying…' : 'Continue'}
				</SubmitButton>
			</form>

			<p className="mt-8 text-sm">
				<Link href={backHref} className="text-[#805b32] underline">
					Back
				</Link>
			</p>
		</main>
	);
}

function digitsOnly(value: string) {
	return value.replace(/\D/g, '').slice(0, 8);
}

function formatTokenDisplay(digits: string) {
	return digits.split('').join(' ');
}
