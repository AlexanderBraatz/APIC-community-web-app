'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { requestPasswordReset } from '@/app/auth/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordRequestForm({
	initialError,
	initialEmail = ''
}: {
	initialError?: string;
	initialEmail?: string;
}) {
	const router = useRouter();
	const [email, setEmail] = useState(initialEmail);
	const [error, setError] = useState(initialError ?? '');
	const [pending, startTransition] = useTransition();

	function onRequestCode(formData: FormData) {
		setError('');
		const nextEmail = normalize(String(formData.get('email') ?? ''));
		setEmail(nextEmail);

		startTransition(async () => {
			if (!nextEmail.includes('@')) {
				setError('Enter a valid email address.');
				return;
			}

			const payload = new FormData();
			payload.set('email', nextEmail);
			const result = await requestPasswordReset(payload);
			if (!result.ok) {
				setError(result.error);
				return;
			}

			router.push(
				`/forgot-password/verify?email=${encodeURIComponent(nextEmail)}&sent=1`
			);
		});
	}

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Reset password</h1>
			<p className="mt-3 text-sm text-[#666]">
				Enter your email and we will send a one-time code if an account exists.
				Codes expire after 24 hours.
			</p>

			{error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}

			<form action={onRequestCode} className="mt-8 space-y-4">
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
				<SubmitButton className="w-full" disabled={pending}>
					{pending ? 'Sending…' : 'Request a code'}
				</SubmitButton>
			</form>

			<p className="mt-8 text-sm">
				<Link href="/sign-in" className="text-[#805b32] underline">
					Back to sign in
				</Link>
			</p>
		</main>
	);
}

function normalize(value: string) {
	return value.trim().toLowerCase();
}
