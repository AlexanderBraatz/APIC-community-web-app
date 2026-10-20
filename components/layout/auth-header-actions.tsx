'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useManualHelp } from '@/components/docs/manual-help-provider';
import { buttonVariants } from '@/components/ui/button';
import {
	getTinaAdminHash,
	resolveManualHelpTarget
} from '@/lib/docs/manual-help-targets';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type AuthHeaderActionsProps = {
	mobile?: boolean;
	onNavigate?: () => void;
};

export default function AuthHeaderActions({
	mobile = false,
	onNavigate
}: AuthHeaderActionsProps) {
	const pathname = usePathname();
	const { openHelp } = useManualHelp();
	const [signedIn, setSignedIn] = useState<boolean | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);

	function handleHelpClick() {
		const target = resolveManualHelpTarget({
			pathname,
			tinaHash: getTinaAdminHash()
		});
		openHelp(target);
		onNavigate?.();
	}

	useEffect(() => {
		const supabase = createClient();
		let cancelled = false;

		async function syncFromCookies() {
			const { data } = await supabase.auth.getClaims();
			const hasSession = Boolean(data?.claims);

			if (!hasSession) {
				if (!cancelled) {
					setSignedIn(false);
					setIsAdmin(false);
				}
				return;
			}

			const {
				data: { user }
			} = await supabase.auth.getUser();

			if (!user) {
				if (!cancelled) {
					setSignedIn(false);
					setIsAdmin(false);
				}
				return;
			}

			const { data: profile } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', user.id)
				.maybeSingle();

			if (!cancelled) {
				setSignedIn(true);
				setIsAdmin(profile?.role === 'admin');
			}
		}

		// Root layout stays mounted across soft navigations, including the
		// server-action redirect after sign-in/out. Re-read cookies on each route.
		void syncFromCookies();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (!session) {
				if (!cancelled) {
					setSignedIn(false);
					setIsAdmin(false);
				}
				return;
			}
			void syncFromCookies();
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [pathname]);

	const linkClass = cn(
		buttonVariants({ variant: 'default', size: 'lg' }),
		mobile && 'w-full'
	);

	if (signedIn === null) {
		return (
			<span
				className={cn(
					'inline-flex h-10 min-w-[8rem] items-center justify-center text-sm text-[#888]',
					mobile && 'w-full'
				)}
				aria-hidden
			/>
		);
	}

	if (!signedIn) {
		return (
			<Link href="/sign-in" className={linkClass} onClick={onNavigate}>
				Sign in
			</Link>
		);
	}

	return (
		<div
			className={cn(
				'flex items-center gap-2',
				mobile && 'w-full flex-col gap-2'
			)}
		>
			<Link href="/place" className={linkClass} onClick={onNavigate}>
				Member Dashboard
			</Link>
			{isAdmin ? (
				<Link
					href="/members/admin"
					className={linkClass}
					onClick={onNavigate}
				>
					Admin Dashboard
				</Link>
			) : null}
			{mobile ? (
				<>
					<Link
						href="/account"
						className="flex w-full items-center justify-center px-4 py-2 text-sm font-medium text-white underline"
						onClick={onNavigate}
					>
						Account
					</Link>
					<button
						type="button"
						onClick={handleHelpClick}
						className={cn(
							buttonVariants({ variant: 'outline' }),
							'w-full border-white/40 bg-transparent text-white hover:bg-white/10'
						)}
					>
						Help
					</button>
				</>
			) : (
				<>
					<Link
						href="/account"
						className={buttonVariants({ variant: 'outline' })}
					>
						Account
					</Link>
					<button
						type="button"
						onClick={handleHelpClick}
						className={buttonVariants({ variant: 'outline' })}
					>
						Help
					</button>
				</>
			)}
		</div>
	);
}
