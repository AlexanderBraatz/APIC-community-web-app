import * as Sentry from '@sentry/nextjs';
import {
	getReplaysOnErrorSampleRate,
	getReplaysSessionSampleRate,
	getSharedSentryOptions,
	isSentryReplayEnabled
} from './lib/sentry/options';

Sentry.init({
	...getSharedSentryOptions(),
	integrations: isSentryReplayEnabled()
		? [
				Sentry.replayIntegration({
					maskAllText: true,
					maskAllInputs: true,
					blockAllMedia: true
				})
			]
		: [],
	replaysSessionSampleRate: getReplaysSessionSampleRate(),
	replaysOnErrorSampleRate: getReplaysOnErrorSampleRate()
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
