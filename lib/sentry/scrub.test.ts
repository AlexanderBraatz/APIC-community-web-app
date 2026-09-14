import { describe, expect, it } from 'vitest';
import { scrubSentryEvent } from '@/lib/sentry/scrub';

describe('scrubSentryEvent', () => {
	it('strips cookies, auth headers, query strings, and user email', () => {
		const event = scrubSentryEvent({
			request: {
				url: 'https://example.com/accept-invite?token=secret-invite',
				cookies: { sb: 'session' },
				headers: {
					authorization: 'Bearer abc',
					'content-type': 'application/json'
				},
				query_string: 'token=secret',
				data: {
					password: 'hunter2',
					note: 'family visit',
					count: 2
				}
			},
			user: {
				id: 'uuid-1',
				email: 'member@example.com',
				username: 'member'
			},
			extra: {
				attendance: [{ note: 'private' }],
				path: '/community-calendar'
			}
		});

		expect(event).not.toBeNull();
		expect(event!.request?.cookies).toEqual({});
		expect(event!.request?.headers?.authorization).toBe('[Filtered]');
		expect(event!.request?.headers?.['content-type']).toBe(
			'application/json'
		);
		expect(event!.request?.query_string).toBe('[Filtered]');
		expect(event!.request?.url).toBe('https://example.com/accept-invite');
		expect(event!.request?.data).toEqual({
			password: '[Filtered]',
			note: '[Filtered]',
			count: 2
		});
		expect(event!.user).toEqual({ id: 'uuid-1' });
		expect(event!.extra?.attendance).toBe('[Filtered]');
		expect(event!.extra?.path).toBe('/community-calendar');
	});
});
