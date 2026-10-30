'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { isSentryConfigured } from '@/lib/sentry/options';

type Status = 'idle' | 'sent' | 'missing_dsn';

export default function SentryTestButton() {
	const [status, setStatus] = useState<Status>('idle');
	const configured = isSentryConfigured();

	function handleClick() {
		if (!configured) {
			setStatus('missing_dsn');
			return;
		}

		Sentry.captureException(
			new Error('Admin dashboard Sentry test error'),
			{
				tags: {
					area: 'admin_test',
					source: 'admin_dashboard'
				},
				level: 'error'
			}
		);
		setStatus('sent');
	}

	return (
		<section>
			<h3 className="text-lg font-medium text-[#444]">Sentry</h3>
			<p className="mt-1 text-sm text-[#666]">
				Send a test error to confirm the DSN and EU project are wired. Look
				under Issues (not User Feedback) on de.sentry.io.
			</p>
			<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
				<Button
					type="button"
					variant="outline"
					onClick={handleClick}
					disabled={!configured}
				>
					Send test Sentry error
				</Button>
				{status === 'sent' ? (
					<p className="text-sm text-[#666]">
						Sent. Check the Sentry Issues inbox for this environment.
					</p>
				) : null}
				{status === 'missing_dsn' || !configured ? (
					<p className="text-sm text-[#666]">
						Sentry is not configured here (`NEXT_PUBLIC_SENTRY_DSN` missing).
					</p>
				) : null}
			</div>
		</section>
	);
}
