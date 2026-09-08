import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
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
