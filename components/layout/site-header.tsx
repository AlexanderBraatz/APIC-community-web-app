'use client';

import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import SiteLogo from './site-logo';

const NAV_ITEMS = [
	{ label: 'Food & Dining', href: '/food-dining' },
	{ label: 'Services & Maintenance', href: '/services-maintenance' },
	{ label: 'Health & Wellness', href: '/health-wellness' },
	{ label: 'Shop & Market', href: '/shop-market' },
	{ label: 'Apic Events', href: '/events' },
	{ label: 'About Us', href: '/about' }
] as const;

function NavLink({
	href,
	label,
	active,
	onClick,
	vertical = false
}: {
	href: string;
	label: string;
	active: boolean;
	onClick?: () => void;
	vertical?: boolean;
}) {
	return (
		<Link
			href={href}
			onClick={onClick}
			className={cn(
				'flex min-h-[50px] w-full items-center text-base font-medium text-white transition-[background-color,box-shadow] duration-100',
				vertical
					? 'justify-start px-4'
					: 'justify-center px-5 border-r border-[#6a4b29] shadow-[inset_1px_0_0_rgba(255,255,255,0.1)]',
				active ? 'bg-[#966b3b]' : 'hover:bg-[#6a4b29]',
				!vertical &&
					!active &&
					'hover:shadow-[-1px_0_0_0_rgba(0,0,0,0.15)]'
			)}
		>
			{label}
		</Link>
	);
}

export default function SiteHeader() {
	const [open, setOpen] = useState(false);
	const [navVisible, setNavVisible] = useState(true);
	const lastScrollY = useRef(0);
	const pathname = usePathname();

	useEffect(() => {
		const onScroll = () => {
			const y = window.scrollY;

			if (y < 80) {
				setNavVisible(true);
			} else if (y > lastScrollY.current) {
				setNavVisible(false);
			} else {
				setNavVisible(true);
			}

			lastScrollY.current = y;
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	const isActive = (href: string) =>
		pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

	return (
		<header>
			{/* Top bar — logo + login, scrolls away on desktop */}
			<div className="border-b border-[#e5e5e5] bg-white">
				<div className="mx-auto flex h-[90px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
					<SiteLogo />

					<Link
						href="/place"
						className="hidden rounded-[2px] border border-[#634627] bg-[#805b32] px-[30px] py-2.5 text-base font-medium text-white transition-[color,background-color,border-color] duration-100 hover:border-[#0a0f0b] hover:bg-[#1f2d22] md:inline-flex"
					>
						Member Dashboard
					</Link>

					<button
						type="button"
						className="inline-flex items-center justify-center rounded-sm p-2 text-[#805b32] md:hidden"
						aria-expanded={open}
						aria-label={open ? 'Close menu' : 'Open menu'}
						onClick={() => setOpen(v => !v)}
					>
						{open ? <X className="size-6" /> : <Menu className="size-6" />}
					</button>
				</div>
			</div>

			{/* Desktop nav — sticky, show on scroll up */}
			<div
				className={cn(
					'sticky top-0 z-50 hidden transition-transform duration-200 md:block',
					navVisible ? 'translate-y-0' : '-translate-y-full'
				)}
			>
				<nav
					className="border-b border-[#6a4b29] bg-[#805b32]"
					style={{
						backgroundImage:
							'linear-gradient(2deg, #7c5831, #845e33)'
					}}
				>
					<ul className="flex w-full items-stretch border-l border-[#6a4b29] shadow-[inset_1px_0_0_rgba(255,255,255,0.1)]">
						{NAV_ITEMS.map(item => (
							<li key={item.href} className="flex flex-1">
								<NavLink
									href={item.href}
									label={item.label}
									active={isActive(item.href)}
								/>
							</li>
						))}
					</ul>
				</nav>
			</div>

			{/* Mobile nav dropdown */}
			{open ? (
				<div className="border-b border-[#6a4b29] bg-[#805b32] md:hidden">
					<nav>
						<ul className="flex flex-col border-t border-[#6a4b29]">
							{NAV_ITEMS.map(item => (
								<li
									key={item.href}
									className="border-b border-[#6a4b29]"
								>
									<NavLink
										href={item.href}
										label={item.label}
										active={isActive(item.href)}
										vertical
										onClick={() => setOpen(false)}
									/>
								</li>
							))}
						</ul>
					</nav>
					<div className="border-t border-[#6a4b29] px-4 py-3">
						<Link
							href="/place"
							className="flex w-full items-center justify-center rounded-[2px] border border-[#634627] bg-[#805b32] px-4 py-2.5 text-base font-medium text-white transition-[color,background-color,border-color] duration-100 hover:border-[#0a0f0b] hover:bg-[#1f2d22]"
							onClick={() => setOpen(false)}
						>
							Member Dashboard
						</Link>
					</div>
				</div>
			) : null}
		</header>
	);
}
