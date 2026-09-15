import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const nextConfig: NextConfig = {
	/* config options here */
	images: {
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
			}
		]
	},
	async redirects() {
		return [
			{
				source: '/events',
				destination: '/blog',
				permanent: true
			},
			{
				source: '/blog/castelfalfi-owners-friends-golf-tournament',
				destination: '/blog/1',
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
