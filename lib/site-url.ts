/**
 * Canonical public origin for Supabase Auth email `redirectTo` links.
 * Server-side only — do not call from browser; browser flows should use
 * relative paths or `window.location.origin` when appropriate.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_SITE_URL (preferred — custom domain / explicit config)
 * 2. VERCEL_URL (https) when deployed on Vercel without an explicit site URL
 * 3. http://localhost:3000 for local development
 */
export function getSiteOrigin(): string {
	const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
	if (explicit) {
		return explicit;
	}

	const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, '');
	if (vercel) {
		return vercel.startsWith('http://') || vercel.startsWith('https://')
			? vercel
			: `https://${vercel}`;
	}

	return 'http://localhost:3000';
}

/**
 * Origin of the current HTTP request when available (e.g. localhost while
 * developing, production host on Vercel). Falls back to {@link getSiteOrigin}.
 * Prefer this for invite email links so local admin invites do not point at
 * production when NEXT_PUBLIC_SITE_URL is set to the live site.
 */
export async function getRequestOrigin(): Promise<string> {
	try {
		const { headers } = await import('next/headers');
		const headerStore = await headers();
		const host =
			headerStore.get('x-forwarded-host')?.split(',')[0]?.trim() ||
			headerStore.get('host')?.trim();
		if (host) {
			const forwardedProto = headerStore
				.get('x-forwarded-proto')
				?.split(',')[0]
				?.trim();
			const proto =
				forwardedProto ||
				(host.includes('localhost') || host.startsWith('127.')
					? 'http'
					: 'https');
			return `${proto}://${host}`.replace(/\/$/, '');
		}
	} catch {
		// Outside a request (build / scripts) — use env fallback.
	}

	return getSiteOrigin();
}
