'use client';

import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import AuthHeaderActions from './auth-header-actions';
import SiteLogo from './site-logo';

const NAV_ITEMS = [
	{ label: 'Attendance Calendar', href: '/community-calendar' },
	{ label: 'Food & Dining', href: '/food-dining' },
	{ label: 'Services & Maintenance', href: '/services-maintenance' },
	{ label: 'Health & Wellness', href: '/health-wellness' },
	{ label: 'Shop & Market', href: '/shop-market' },
	{ label: 'Events & Activities', href: '/blog' },
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
				'flex min-h-[50px] w-full items-center py-2 text-base text-center font-medium text-white transition-[background-color,box-shadow] duration-100',
				vertical
					? 'justify-start px-4'
					: 'justify-center px-5 border-r border-[#6a4b29] shadow-[inset_1px_0_0_rgba(255,255,255,0.1)]',
				active ? 'bg-[#966b3b]' : 'hover:bg-[#6a4b29]',
				!vertical && !active && 'hover:shadow-[-1px_0_0_0_rgba(0,0,0,0.15)]'
			)}
		>
			{label}
		</Link>
	);
}

export default function SiteHeader() {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	const isActive = (href: string) =>
		pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

	return (
		<header>
			{/* Top bar — logo + login */}
			<div className="border-b border-[#e5e5e5] bg-white">
				<div className="mx-auto flex h-[90px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
					<SiteLogo />

					<div className="hidden md:block">
						<AuthHeaderActions />
					</div>

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

			{/* Desktop nav */}
			<div className="hidden md:block">
				<nav
					className="border-b border-[#6a4b29] bg-[#805b32]"
					style={{
						backgroundImage: 'linear-gradient(2deg, #7c5831, #845e33)'
					}}
				>
					<ul className="flex w-full items-stretch border-l border-[#6a4b29] shadow-[inset_1px_0_0_rgba(255,255,255,0.1)]">
						{NAV_ITEMS.map(item => (
							<li
								key={item.href}
								className="flex flex-1"
							>
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
						<AuthHeaderActions
							mobile
							onNavigate={() => setOpen(false)}
						/>
					</div>
				</div>
			) : null}
		</header>
	);
}
