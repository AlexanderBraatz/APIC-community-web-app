import * as Sentry from '@sentry/nextjs';
import {
	getReplaysOnErrorSampleRate,
	getReplaysSessionSampleRate,
	getSharedSentryOptions,
	isSentryConfigured,
	isSentryReplayEnabled
} from './lib/sentry/options';

/** Matches site CTAs: border #634627, bg #805b32, hover #1f2d22. */
const feedbackTheme = {
	background: '#ffffff',
	foreground: '#444444',
	accentBackground: '#805b32',
	accentForeground: '#ffffff',
	outline: '1px auto #805b32'
} as const;

Sentry.init({
	...getSharedSentryOptions(),
	integrations: [
		...(isSentryConfigured()
			? [
					Sentry.feedbackIntegration({
						autoInject: true,
						colorScheme: 'light',
						themeLight: feedbackTheme
					})
				]
			: []),
		...(isSentryReplayEnabled()
			? [
					Sentry.replayIntegration({
						maskAllText: true,
						maskAllInputs: true,
						blockAllMedia: true
					})
				]
			: [])
	],
	replaysSessionSampleRate: getReplaysSessionSampleRate(),
	replaysOnErrorSampleRate: getReplaysOnErrorSampleRate()
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
