import type { NextConfig } from 'next';

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

export default nextConfig;
