'use client';

import Link from 'next/link';
import { useState } from 'react';
import { updatePrivacyPreferences } from '@/lib/privacy/actions';
import { useAnalytics } from '@/components/analytics/posthog-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Props = {
	analyticsEnabled: boolean;
	sessionReplayEnabled: boolean;
};

export function AccountPrivacyForm({
	analyticsEnabled: initialAnalytics,
	sessionReplayEnabled: initialReplay
}: Props) {
	const { setConsent } = useAnalytics();
	const propsKey = `${initialAnalytics}:${initialReplay}`;
	const [override, setOverride] = useState<{
		analyticsEnabled: boolean;
		sessionReplayEnabled: boolean;
	} | null>(null);
	const [overridePropsKey, setOverridePropsKey] = useState(propsKey);

	if (overridePropsKey !== propsKey) {
		setOverridePropsKey(propsKey);
		setOverride(null);
	}

	const analyticsEnabled = override?.analyticsEnabled ?? initialAnalytics;
	const sessionReplayEnabled =
		override?.sessionReplayEnabled ?? initialReplay;

	function toggleAnalytics() {
		const next = {
			analyticsEnabled: !analyticsEnabled,
			sessionReplayEnabled
		};
		setOverride(next);
		setConsent(next);
	}

	function toggleReplay() {
		const next = {
			analyticsEnabled,
			sessionReplayEnabled: !sessionReplayEnabled
		};
		setOverride(next);
		setConsent(next);
	}

	return (
		<section className="mt-10 space-y-4 border-t border-[#e5e5e5] pt-6">
			<h2 className="text-lg font-medium text-[#444]">Privacy &amp; analytics</h2>
			<p className="text-sm text-[#666]">
				Control optional usage analytics and session recording. Essential error
				monitoring stays on. See the{' '}
				<Link
					href="/privacy"
					className="text-[#805b32] underline"
				>
					Privacy Policy
				</Link>{' '}
				and{' '}
				<Link
					href="/terms"
					className="text-[#805b32] underline"
				>
					Terms &amp; Conditions
				</Link>
				.
			</p>

			<form
				action={updatePrivacyPreferences}
				onSubmit={() => {
					setConsent({
						analyticsEnabled,
						sessionReplayEnabled
					});
				}}
				className="space-y-6"
			>
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
						onClick={toggleAnalytics}
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
						<Label className="text-base text-[#444]">Session recording</Label>
						<p className="mt-1 text-sm text-[#666]">
							Allow privacy-protected recordings of your interactions to help
							diagnose problems and improve APIC.
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={sessionReplayEnabled}
						onClick={toggleReplay}
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

				<Button
					type="submit"
					className="rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22]"
				>
					Save privacy preferences
				</Button>
			</form>
		</section>
	);
}
