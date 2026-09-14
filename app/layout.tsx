import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import { AnalyticsRoot } from '@/components/analytics/analytics-root';
import { PostHogSignOutReset } from '@/components/analytics/posthog-sign-out-reset';
import SiteFooter from '@/components/layout/site-footer';
import SiteHeader from '@/components/layout/site-header';
import './globals.css';

const inter = Inter({
	variable: '--font-sans',
	subsets: ['latin']
});

const playfair = Playfair_Display({
	variable: '--font-heading',
	subsets: ['latin']
});

export const metadata: Metadata = {
	title: 'APIC Owners Community',
	description: 'Your Private Owners Community in Castelfalfi'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${playfair.variable} h-full antialiased`}
		>
			<body className="flex min-h-full flex-col bg-white font-sans text-[#444444]">
				<AnalyticsRoot>
					<Suspense fallback={null}>
						<PostHogSignOutReset />
					</Suspense>
					<SiteHeader />
					<div className="flex-1">{children}</div>
					<SiteFooter />
				</AnalyticsRoot>
			</body>
		</html>
	);
}
