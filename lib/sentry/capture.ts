import * as Sentry from '@sentry/nextjs';

/**
 * Capture unexpected failures from critical server actions.
 * Do not call for expected user validation errors (wrong password, etc.).
 */
export function captureServerActionException(
	error: unknown,
	action: string,
	tags?: Record<string, string>
) {
	Sentry.captureException(error, {
		tags: {
			area: 'server_action',
			action,
			...tags
		}
	});
}

/**
 * Report a public 404 so ops can spot broken links / mistyped URLs.
 * Uses warning (not error) so bot probes don't trip high-severity Slack alerts;
 * filter Issues by tag `area:not_found`.
 */
export function captureNotFoundPage(pathname: string) {
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	Sentry.captureMessage(`Page not found: ${path}`, {
		level: 'warning',
		tags: {
			area: 'not_found'
		},
		fingerprint: ['not_found', path],
		extra: {
			pathname: path
		}
	});
}
