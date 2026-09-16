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
