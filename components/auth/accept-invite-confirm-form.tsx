'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buttonVariants } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/utils';

export function AcceptInviteConfirmForm({
	tokenHash,
	email
}: {
	tokenHash: string;
	email: string;
}) {
	const router = useRouter();
	const [error, setError] = useState('');
	const [pending, startTransition] = useTransition();
	const requestHref = email
		? `/accept-invite?email=${encodeURIComponent(email)}`
		: '/accept-invite';

	function onContinue() {
		setError('');
		startTransition(async () => {
			const supabase = createClient();
			const { error: verifyError } = await supabase.auth.verifyOtp({
				token_hash: tokenHash,
				type: 'invite'
			});

			if (verifyError) {
				// Spent/expired link but still signed in from an earlier success → resume onboarding.
				const {
					data: { user }
				} = await supabase.auth.getUser();
				if (user) {
					router.replace('/accept-invite');
					return;
				}

				setError(
					'This invitation link has expired or is no longer valid.'
				);
				return;
			}

			router.replace('/accept-invite');
		});
	}

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Set up your account
			</h1>
			<p className="mt-3 text-sm text-[#666]">
				{email ? (
					<>
						Continue to join APIC with{' '}
						<span className="font-medium text-[#444]">{email}</span>.
					</>
				) : (
					<>Continue to join APIC Community.</>
				)}
			</p>

			{error ? (
				<>
					<p
						className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
						role="alert"
					>
						{error}{' '}
						<Link href={requestHref} className="font-medium underline">
							Request a one-time code
						</Link>{' '}
						to continue.
					</p>
					<div className="mt-8 flex justify-center">
						<Link
							href={requestHref}
							className={cn(buttonVariants({ variant: 'default' }), 'w-full gap-2')}
						>
							<ArrowRight aria-hidden />
							Request a one-time code
						</Link>
					</div>
				</>
			) : (
				<form action={onContinue} className="mt-8">
					<SubmitButton className="w-full" disabled={pending}>
						{pending ? 'Continuing…' : 'Continue'}
					</SubmitButton>
				</form>
			)}

			<p className="mt-8 text-sm text-[#666]">
				Link not working?{' '}
				<Link href={requestHref} className="text-[#805b32] underline">
					Request a one-time code
				</Link>
			</p>
		</main>
	);
}
