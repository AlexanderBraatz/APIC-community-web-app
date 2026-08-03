import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import AdminNavLink from '@/components/layout/admin-nav-link';
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
				<SiteHeader />
				<AdminNavLink />
				<div className="flex-1">{children}</div>
				<SiteFooter />
			</body>
		</html>
	);
}
