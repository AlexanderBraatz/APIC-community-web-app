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
