type ScrubbableEvent = {
	request?: {
		cookies?: unknown;
		headers?: unknown;
		data?: unknown;
		query_string?: unknown;
		url?: string;
	};
	user?: {
		id?: string | number;
		email?: string | null;
		username?: string | null;
		ip_address?: string | null;
		[key: string]: unknown;
	} | null;
	extra?: Record<string, unknown>;
	contexts?: Record<string, unknown>;
	breadcrumbs?: Array<{
		data?: Record<string, unknown>;
		[key: string]: unknown;
	}>;
};

const SENSITIVE_KEY =
	/pass(word)?|secret|token|authorization|cookie|email|invite|invitation|note|attendance|stay|phone|bearer|apikey|api[_-]?key|refresh|session/i;

const SENSITIVE_HEADER =
	/^(cookie|set-cookie|authorization|x-supabase|x-api-key|x-auth)/i;

function scrubValue(key: string, value: unknown): unknown {
	if (SENSITIVE_KEY.test(key)) {
		return '[Filtered]';
	}
	if (Array.isArray(value)) {
		return value.map((item, index) => scrubValue(String(index), item));
	}
	if (value && typeof value === 'object') {
		return scrubRecord(value as Record<string, unknown>);
	}
	if (typeof value === 'string' && value.length > 500) {
		return `${value.slice(0, 200)}…[truncated]`;
	}
	return value;
}

function scrubRecord(
	input: Record<string, unknown>
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		out[key] = scrubValue(key, value);
	}
	return out;
}

function scrubHeaders(headers: unknown): Record<string, string> | undefined {
	if (!headers || typeof headers !== 'object') return undefined;
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(
		headers as Record<string, unknown>
	)) {
		out[key] = SENSITIVE_HEADER.test(key)
			? '[Filtered]'
			: typeof value === 'string'
				? value
				: String(value);
	}
	return out;
}

function scrubRequest(event: ScrubbableEvent) {
	const request = event.request;
	if (!request) return;

	if (request.cookies) {
		request.cookies = {};
	}
	if (request.headers) {
		request.headers = scrubHeaders(request.headers);
	}
	if (request.data !== undefined) {
		request.data =
			typeof request.data === 'object' && request.data !== null
				? scrubRecord(request.data as Record<string, unknown>)
				: '[Filtered]';
	}
	if (request.query_string) {
		request.query_string = '[Filtered]';
	}
	// Drop query/hash so invite tokens never leave the app.
	if (typeof request.url === 'string') {
		try {
			const url = new URL(request.url);
			url.search = '';
			url.hash = '';
			request.url = url.toString();
		} catch {
			request.url = request.url.split('?')[0]?.split('#')[0] ?? request.url;
		}
	}
}

function scrubUser(event: ScrubbableEvent) {
	if (!event.user) return;
	const id = typeof event.user.id === 'string' ? event.user.id : undefined;
	event.user = id ? { id } : undefined;
}

function scrubExtras(event: ScrubbableEvent) {
	if (event.extra) {
		event.extra = scrubRecord(event.extra);
	}
	if (event.contexts) {
		event.contexts = scrubRecord(event.contexts);
	}
	if (event.breadcrumbs) {
		event.breadcrumbs = event.breadcrumbs.map(crumb => {
			if (crumb.data) {
				return {
					...crumb,
					data: scrubRecord(crumb.data)
				};
			}
			return crumb;
		});
	}
}

/**
 * Strip cookies, auth headers, emails, tokens, stay/attendance payloads,
 * and other member PII before events leave the app.
 */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T | null {
	scrubRequest(event);
	scrubUser(event);
	scrubExtras(event);
	return event;
}
