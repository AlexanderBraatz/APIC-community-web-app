import posthog from 'posthog-js';

export const AUTH_URL_BLOCKLIST = [
	'/sign-in',
	'/accept-invite',
	'/forgot-password',
	'/reset-password'
] as const;

let initialized = false;
let analyticsConsent = false;
let replayConsent = false;

export function getPostHogKey(): string | undefined {
	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
	return key || undefined;
}

export function getPostHogHost(): string {
	return (
		process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com'
	);
}

export function isPostHogConfigured(): boolean {
	return Boolean(getPostHogKey());
}

export function isAuthCredentialPath(pathname: string): boolean {
	return AUTH_URL_BLOCKLIST.some(
		prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

/**
 * Lazily initialise PostHog. Safe to call multiple times.
 * Does not enable capturing — callers must apply consent via applyAnalyticsConsent.
 */
export function initPostHog(): typeof posthog | null {
	const key = getPostHogKey();
	if (!key || typeof window === 'undefined') return null;

	if (!initialized) {
		posthog.init(key, {
			api_host: getPostHogHost(),
			person_profiles: 'identified_only',
			capture_pageview: false,
			capture_pageleave: false,
			autocapture: false,
			persistence: 'localStorage+cookie',
			opt_out_capturing_by_default: true,
			disable_session_recording: true,
			session_recording: {
				maskAllInputs: true,
				recordCrossOriginIframes: false
			}
		});
		initialized = true;
	}

	return posthog;
}

export function getPostHog(): typeof posthog | null {
	if (!initialized || !isPostHogConfigured()) return null;
	return posthog;
}

export function getAnalyticsConsent(): boolean {
	return analyticsConsent;
}

export function getReplayConsent(): boolean {
	return replayConsent;
}

/**
 * Apply member consent. Analytics and session replay are independent.
 * Custom events fire only when analytics is enabled; replay only when
 * replay is enabled (and not on auth credential routes).
 */
export function applyAnalyticsConsent(opts: {
	userId: string;
	role?: string | null;
	analyticsEnabled: boolean;
	sessionReplayEnabled: boolean;
	pathname?: string;
}) {
	analyticsConsent = opts.analyticsEnabled;
	replayConsent = opts.sessionReplayEnabled;

	const client = initPostHog();
	if (!client) return;

	if (!opts.analyticsEnabled && !opts.sessionReplayEnabled) {
		client.stopSessionRecording();
		client.opt_out_capturing();
		return;
	}

	client.identify(opts.userId, opts.role ? { role: opts.role } : undefined);
	client.opt_in_capturing();

	const onAuthPage =
		opts.pathname !== undefined && isAuthCredentialPath(opts.pathname);

	if (opts.sessionReplayEnabled && !onAuthPage) {
		client.startSessionRecording();
	} else {
		client.stopSessionRecording();
	}
}

export function syncSessionRecordingForPath(pathname: string) {
	const client = getPostHog();
	if (!client || !replayConsent) return;

	if (isAuthCredentialPath(pathname)) {
		client.stopSessionRecording();
	} else {
		client.startSessionRecording();
	}
}

export function resetPostHog() {
	analyticsConsent = false;
	replayConsent = false;
	const client = getPostHog();
	if (!client) return;
	client.stopSessionRecording();
	client.opt_out_capturing();
	client.reset();
}

export function trackEvent(
	event: string,
	properties?: Record<string, string | number | boolean | null | undefined>
) {
	if (!analyticsConsent) return;
	const client = getPostHog();
	if (!client || client.has_opted_out_capturing()) return;
	client.capture(event, properties);
}

export function trackPageView(path: string) {
	trackEvent('page_view', { path });
}
