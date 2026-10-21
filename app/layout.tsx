import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import { AnalyticsRoot } from '@/components/analytics/analytics-root';
import { PostHogSignOutReset } from '@/components/analytics/posthog-sign-out-reset';
import { ManualHelpProvider } from '@/components/docs/manual-help-provider';
import SiteFooter from '@/components/layout/site-footer';
import SiteHeader from '@/components/layout/site-header';
import { getProfileManualHelpContext } from '@/lib/docs/resolve-manual-source';
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
	description: 'Your Private Owners Community in Castelfalfi',
	// Discourage auto-translate (e.g. Safari / Chrome on non-English devices)
	other: {
		google: 'notranslate'
	}
};

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { language: manualLanguage, isAdmin } =
		await getProfileManualHelpContext();

	return (
		<html
			lang="en"
			translate="no"
			className={`notranslate ${inter.variable} ${playfair.variable} h-full antialiased`}
		>
			<body className="min-h-full bg-white font-sans text-[#444444]">
				{/*
				 * Base UI portals (dialog/popover) render as siblings of this root.
				 * isolation ensures they stack above page content without z-index wars.
				 */}
				<div className="root isolate flex min-h-full flex-col">
					<AnalyticsRoot>
						<ManualHelpProvider
							language={manualLanguage}
							isAdmin={isAdmin}
						>
							<Suspense fallback={null}>
								<PostHogSignOutReset />
							</Suspense>
							<SiteHeader />
							<div className="flex-1">{children}</div>
							<SiteFooter />
						</ManualHelpProvider>
					</AnalyticsRoot>
				</div>
			</body>
		</html>
	);
}
