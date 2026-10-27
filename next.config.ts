import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

function supabaseStorageHostname(): string | null {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
	if (!url) return null;
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

const supabaseHostname = supabaseStorageHostname();

const nextConfig: NextConfig = {
	/* config options here */
	// Phone / LAN testing: Next blocks /_next/* from non-localhost hosts unless listed.
	// Dev-only. Prefer a specific LAN IP over private-range wildcards.
	allowedDevOrigins: ['192.168.0.115'],
	experimental: {
		serverActions: {
			// Match blog-images / MAX_IMAGE_BYTES (10 MiB). Leave headroom for multipart overhead.
			bodySizeLimit: '10mb'
		}
	},
	images: {
		// Allowlist local paths for next/image (manual screenshots + site assets).
		localPatterns: [
			{ pathname: '/docs/screenshots/**', search: '' },
			{ pathname: '/images/**', search: '' }
		],
		// TinaCloud repo media is served from the assets CDN in production
		// (admin previews work; next/image needs these hosts or it returns 400).
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'assets.tinajs.io',
				pathname: '/**'
			},
			{
				protocol: 'https',
				hostname: 'assets.tina.io',
				pathname: '/**'
			},
			// Blog images from Supabase Storage (public blog-images bucket).
			...(supabaseHostname
				? [
						{
							protocol: 'https' as const,
							hostname: supabaseHostname,
							pathname: '/storage/v1/object/public/blog-images/**'
						}
					]
				: [
						{
							protocol: 'https' as const,
							hostname: '*.supabase.co',
							pathname: '/storage/v1/object/public/blog-images/**'
						}
					])
		]
	},
	async redirects() {
		// `/blog/1` → title slug via `blog_slug_redirects` (Stage 7).
		// Title slug is the canonical public URL.
		return [
			{
				source: '/events',
				destination: '/blog',
				permanent: true
			}
		];
	},
	async rewrites() {
		return [
			{
				source: '/admin',
				destination: '/admin/index.html'
			}
		];
	}
};

export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	authToken: process.env.SENTRY_AUTH_TOKEN,
	silent: !process.env.CI,
	widenClientFileUpload: true,
	// Fixed tunnel path — also excluded from auth proxy matcher.
	tunnelRoute: '/sentry-tunnel',
	sourcemaps: {
		deleteSourcemapsAfterUpload: true
	},
	// Local/CI builds without auth token should still succeed.
	errorHandler: err => {
		console.warn('[sentry] source map upload skipped:', err.message);
	},
	bundleSizeOptimizations: {
		excludeDebugStatements: true
	}
});
