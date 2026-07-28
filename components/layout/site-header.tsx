'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import SiteLogo from './site-logo';

const NAV_ITEMS = [
	{ label: 'Food & Dining', href: '/food-dining' },
	{ label: 'Services & Maintenance', href: '/services-maintenance' },
	{ label: 'Health & Wellness', href: '/health-wellness' },
	{ label: 'Shop & Market', href: '/shop-market' },
	{ label: 'Apic Events', href: '/events' },
	{ label: 'About Us', href: '/about' }
] as const;

export default function SiteHeader() {
	const [open, setOpen] = useState(false);

	return (
		<header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
			<div className="mx-auto flex h-[90px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				<SiteLogo />

				<Link
					href="/login"
					className="hidden rounded-sm bg-[#7A5A32] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5D4325] md:inline-flex"
				>
					Member Login
				</Link>

				<button
					type="button"
					className="inline-flex items-center justify-center rounded-sm p-2 text-[#7A5A32] md:hidden"
					aria-expanded={open}
					aria-label={open ? 'Close menu' : 'Open menu'}
					onClick={() => setOpen(v => !v)}
				>
					{open ? <X className="size-6" /> : <Menu className="size-6" />}
				</button>
			</div>

			<nav className="hidden bg-[#7A5A32] md:block">
				<ul className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 lg:gap-x-10">
					{NAV_ITEMS.map(item => (
						<li key={item.href}>
							<Link
								href={item.href}
								className="text-sm font-medium tracking-wide text-white/95 transition-opacity hover:underline hover:opacity-80"
							>
								{item.label}
							</Link>
						</li>
					))}
				</ul>
			</nav>

			{open ? (
				<div className="border-t border-[#7A5A32]/15 bg-white md:hidden">
					<nav className="bg-[#7A5A32] px-4 py-3">
						<ul className="flex flex-col gap-1">
							{NAV_ITEMS.map(item => (
								<li key={item.href}>
									<Link
										href={item.href}
										className="block rounded-sm px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5D4325]"
										onClick={() => setOpen(false)}
									>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>
					<div className="px-4 py-3">
						<Link
							href="/login"
							className="flex w-full items-center justify-center rounded-sm bg-[#7A5A32] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5D4325]"
							onClick={() => setOpen(false)}
						>
							Member Login
						</Link>
					</div>
				</div>
			) : null}
		</header>
	);
}
