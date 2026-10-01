'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { requestInviteOtp } from '@/lib/invitations/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AcceptInviteRequestForm({
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
			const result = await requestInviteOtp(payload);
			if (!result.ok) {
				setError(result.error);
				return;
			}

			router.push(
				`/accept-invite/verify?email=${encodeURIComponent(nextEmail)}&sent=1`
			);
		});
	}

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Accept invitation</h1>
			<p className="mt-3 text-sm text-[#666]">
				Enter the email you were invited with and we will send a one-time code.
				Codes expire after 24 hours — only approved emails can receive a code.
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
					Already set a password? Sign in
				</Link>
			</p>
		</main>
	);
}

function normalize(value: string) {
	return value.trim().toLowerCase();
}
