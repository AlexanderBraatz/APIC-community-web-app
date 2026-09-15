import type { ErrorEvent, EventHint, TransactionEvent } from '@sentry/core';
import { scrubSentryEvent } from './scrub';

/** Public browser DSN, with server-only fallback. */
export function getSentryDsn(): string | undefined {
	const dsn =
		process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
		process.env.SENTRY_DSN?.trim();
	return dsn || undefined;
}

export function isSentryConfigured(): boolean {
	return Boolean(getSentryDsn());
}

/**
 * Separate Sentry projects are expected for local/dev vs production
 * (different DSNs). Environment is still tagged for filtering/alerts.
 */
export function getSentryEnvironment(): string {
	const explicit = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim();
	if (explicit) return explicit;

	const vercel = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
	if (
		vercel === 'production' ||
		vercel === 'preview' ||
		vercel === 'development'
	) {
		return vercel;
	}

	return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export function getTracesSampleRate(): number {
	return getSentryEnvironment() === 'production' ? 0.1 : 1.0;
}

/** Production-only Session Replay (client). Never random-record full sessions. */
export function isSentryReplayEnabled(): boolean {
	return getSentryEnvironment() === 'production';
}

export function getReplaysSessionSampleRate(): number {
	return 0;
}

export function getReplaysOnErrorSampleRate(): number {
	return isSentryReplayEnabled() ? 1.0 : 0;
}

/**
 * Shared privacy-first init options for client, server, and edge.
 * Always-on essential monitoring — independent of PostHog consent.
 */
export function getSharedSentryOptions() {
	const dsn = getSentryDsn();

	return {
		dsn,
		enabled: Boolean(dsn),
		environment: getSentryEnvironment(),
		sendDefaultPii: false as const,
		dataCollection: {
			userInfo: false,
			cookies: false,
			httpHeaders: {
				request: false,
				response: false
			},
			httpBodies: [] as Array<
				| 'incomingRequest'
				| 'outgoingRequest'
				| 'incomingResponse'
				| 'outgoingResponse'
			>,
			urlQueryParams: false,
			databaseQueryData: false,
			stackFrameVariables: false
		},
		tracesSampleRate: getTracesSampleRate(),
		beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
			scrubSentryEvent(event as Parameters<typeof scrubSentryEvent>[0]);
			return event;
		},
		beforeSendTransaction(
			event: TransactionEvent,
			_hint: EventHint
		): TransactionEvent | null {
			scrubSentryEvent(event as Parameters<typeof scrubSentryEvent>[0]);
			return event;
		}
	};
}
