import * as Sentry from '@sentry/nextjs';
import { getSharedSentryOptions } from './lib/sentry/options';

Sentry.init({
	...getSharedSentryOptions()
	// No Sentry Session Replay — product replay is consent-gated via PostHog.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
