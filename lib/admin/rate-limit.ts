/**
 * Simple process-local sliding-window rate limiter for admin mutating actions.
 * Suitable for a single Node server instance; use Redis/Upstash if you scale out.
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
	| { ok: true }
	| { ok: false; error: string; retryAfterSec: number };

export function checkRateLimit(
	key: string,
	limit: number,
	windowMs: number
): RateLimitResult {
	const now = Date.now();
	const cutoff = now - windowMs;
	const prior = buckets.get(key) ?? [];
	const recent = prior.filter(ts => ts > cutoff);

	if (recent.length >= limit) {
		const oldest = recent[0] ?? now;
		const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
		buckets.set(key, recent);
		return {
			ok: false,
			error: `Too many requests. Try again in about ${retryAfterSec}s.`,
			retryAfterSec
		};
	}

	recent.push(now);
	buckets.set(key, recent);
	return { ok: true };
}

/** Invite / resend: 20 per admin per hour. */
export function limitInvite(adminUserId: string): RateLimitResult {
	return checkRateLimit(`invite:${adminUserId}`, 20, 60 * 60 * 1000);
}

/** Single geocode call: 30 per admin per minute. */
export function limitGeocode(adminUserId: string): RateLimitResult {
	return checkRateLimit(`geocode:${adminUserId}`, 30, 60 * 1000);
}

/** Batch “geocode missing”: 5 per admin per hour. */
export function limitGeocodeBatch(adminUserId: string): RateLimitResult {
	return checkRateLimit(`geocode-batch:${adminUserId}`, 5, 60 * 60 * 1000);
}

/** Places autocomplete / place details: 60 per admin per minute. */
export function limitPlaces(adminUserId: string): RateLimitResult {
	return checkRateLimit(`places:${adminUserId}`, 60, 60 * 1000);
}
