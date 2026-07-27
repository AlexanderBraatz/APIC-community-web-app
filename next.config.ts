import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
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
