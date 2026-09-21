'use client';

import Link from 'next/link';
import { useState } from 'react';
import { saveInvitePrivacyChoices } from '@/lib/privacy/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Label } from '@/components/ui/label';

type Props = {
	error?: string;
};

export function InvitePrivacyStep({ error }: Props) {
	const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
	const [sessionReplayEnabled, setSessionReplayEnabled] = useState(false);
	const [termsAccepted, setTermsAccepted] = useState(false);

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Privacy &amp; analytics
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				APIC — Associazione Proprietari Castelfalfi. Optional usage analytics
				and product insights help improve the community. Essential error
				monitoring stays on for reliability.
			</p>

			{error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}

			<div className="mt-6 space-y-2 rounded-[2px] border border-[#e5e5e5] bg-[#faf8f5] px-4 py-3 text-sm text-[#444]">
				<label className="flex items-start gap-3">
					<input
						type="checkbox"
						checked={termsAccepted}
						onChange={event => setTermsAccepted(event.target.checked)}
						className="mt-1 size-4 accent-[#805b32]"
						required
					/>
					<span>
						I accept the{' '}
						<Link
							href="/terms"
							target="_blank"
							className="text-[#805b32] underline"
						>
							Terms &amp; Conditions
						</Link>{' '}
						and have read the{' '}
						<Link
							href="/privacy"
							target="_blank"
							className="text-[#805b32] underline"
						>
							Privacy Policy
						</Link>
						.
					</span>
				</label>
			</div>

			<form action={saveInvitePrivacyChoices} className="mt-8 space-y-6">
				<input
					type="hidden"
					name="terms_accepted"
					value={termsAccepted ? 'true' : 'false'}
				/>

				<div className="space-y-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							<Label className="text-base text-[#444]">Usage analytics</Label>
							<p className="mt-1 text-sm text-[#666]">
								Helps us understand which pages and features are most useful.
							</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={analyticsEnabled}
							onClick={() => setAnalyticsEnabled(value => !value)}
							className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
								analyticsEnabled ? 'bg-[#805b32]' : 'bg-[#ccc]'
							}`}
						>
							<span
								className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white transition-transform ${
									analyticsEnabled ? 'translate-x-5' : ''
								}`}
							/>
						</button>
					</div>

					<div className="flex items-start justify-between gap-4">
						<div>
							<Label className="text-base text-[#444]">Product insights</Label>
							<p className="mt-1 text-sm text-[#666]">
								Optional insights into how you use the site so we can improve it.
							</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={sessionReplayEnabled}
							onClick={() => setSessionReplayEnabled(value => !value)}
							className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
								sessionReplayEnabled ? 'bg-[#805b32]' : 'bg-[#ccc]'
							}`}
						>
							<span
								className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white transition-transform ${
									sessionReplayEnabled ? 'translate-x-5' : ''
								}`}
							/>
						</button>
					</div>
				</div>

				<p className="text-sm text-[#666]">
					You can change these later in your account settings.
				</p>

				<div className="space-y-3">
					<SubmitButton
						name="choice"
						value="decline"
						disabled={!termsAccepted}
						variant="outline"
						onClick={() => {
							setAnalyticsEnabled(false);
							setSessionReplayEnabled(false);
						}}
						className="w-full sm:w-auto"
					>
						Continue without optional analytics
					</SubmitButton>
					<SubmitButton
						name="choice"
						value="accept"
						disabled={!termsAccepted}
						onClick={() => {
							setAnalyticsEnabled(true);
							setSessionReplayEnabled(true);
						}}
						className="w-full sm:w-auto"
					>
						Accept all and continue
					</SubmitButton>
				</div>
			</form>
		</main>
	);
}
