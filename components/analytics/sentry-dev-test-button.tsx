'use client';

import { Button } from '@/components/ui/button';

/**
 * Dev-only control to verify Sentry client capture.
 * Hidden in production builds (NODE_ENV === 'production').
 */
export function SentryDevTestButton() {
	return (
		<section className="mt-10 space-y-3 border-t border-dashed border-amber-300 pt-6">
			<h2 className="text-lg font-medium text-amber-900">
				Sentry (development only)
			</h2>
			<p className="text-sm text-amber-900/80">
				Throws a client error so you can confirm it appears in your Sentry
				dev project. This block is not rendered in production builds.
			</p>
			<Button
				type="button"
				variant="outline"
				className="rounded-[2px] border-amber-700 text-amber-950"
				onClick={() => {
					throw new Error('Sentry Phase 2 test client');
				}}
			>
				Throw test error
			</Button>
		</section>
	);
}
