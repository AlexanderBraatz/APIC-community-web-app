'use client';

import Link from 'next/link';
import { useState } from 'react';
import { saveInvitePrivacyChoices } from '@/lib/privacy/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Props = {
	error?: string;
};

export function InvitePrivacyStep({ error }: Props) {
	const [mode, setMode] = useState<'choose' | 'manage'>('choose');
	const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
	const [sessionReplayEnabled, setSessionReplayEnabled] = useState(true);
	const [termsAccepted, setTermsAccepted] = useState(false);

	return (
		<main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Privacy &amp; analytics
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				Optional usage analytics and session recording help improve APIC. You
				can change these later under Account. Essential error monitoring stays
				on for reliability.
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

			{mode === 'choose' ? (
				<form
					action={saveInvitePrivacyChoices}
					className="mt-8 space-y-3"
				>
					<input
						type="hidden"
						name="terms_accepted"
						value={termsAccepted ? 'true' : 'false'}
					/>
					<Button
						type="submit"
						name="choice"
						value="accept"
						disabled={!termsAccepted}
						className="w-full rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22] disabled:opacity-50"
					>
						Accept optional analytics
					</Button>
					<Button
						type="submit"
						name="choice"
						value="decline"
						disabled={!termsAccepted}
						variant="outline"
						className="w-full rounded-[2px] border-[#634627] disabled:opacity-50"
					>
						Decline
					</Button>
					<button
						type="button"
						disabled={!termsAccepted}
						onClick={() => setMode('manage')}
						className="w-full py-2 text-sm text-[#805b32] underline disabled:opacity-50"
					>
						Manage preferences
					</button>
				</form>
			) : (
				<form
					action={saveInvitePrivacyChoices}
					className="mt-8 space-y-6"
				>
					<input
						type="hidden"
						name="terms_accepted"
						value={termsAccepted ? 'true' : 'false'}
					/>
					<input
						type="hidden"
						name="choice"
						value="manage"
					/>
					<input
						type="hidden"
						name="analytics_enabled"
						value={analyticsEnabled ? 'true' : 'false'}
					/>
					<input
						type="hidden"
						name="session_replay_enabled"
						value={sessionReplayEnabled ? 'true' : 'false'}
					/>

					<div className="space-y-4">
						<div className="flex items-start justify-between gap-4">
							<div>
								<Label className="text-base text-[#444]">Usage analytics</Label>
								<p className="mt-1 text-sm text-[#666]">
									Help APIC understand which pages and features are most useful.
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
								<Label className="text-base text-[#444]">
									Session recording
								</Label>
								<p className="mt-1 text-sm text-[#666]">
									Allow privacy-protected recordings of how you interact with
									APIC to help identify problems. Passwords are masked; login
									pages are not recorded.
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

					<Button
						type="submit"
						disabled={!termsAccepted}
						className="w-full rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22] disabled:opacity-50"
					>
						Save and continue
					</Button>
					<button
						type="button"
						onClick={() => setMode('choose')}
						className="w-full py-2 text-sm text-[#666] underline"
					>
						Back
					</button>
				</form>
			)}
		</main>
	);
}
