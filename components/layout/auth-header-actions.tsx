'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from '@/app/auth/actions';
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
	const [signedIn, setSignedIn] = useState<boolean | null>(null);

	useEffect(() => {
		const supabase = createClient();
		let cancelled = false;

		async function syncFromCookies() {
			const { data } = await supabase.auth.getClaims();
			if (!cancelled) {
				setSignedIn(Boolean(data?.claims));
			}
		}

		// Root layout stays mounted across soft navigations, including the
		// server-action redirect after sign-in/out. Re-read cookies on each route.
		void syncFromCookies();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (!cancelled) {
				setSignedIn(Boolean(session));
			}
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [pathname]);

	const linkClass = cn(
		'rounded-[2px] border border-[#634627] bg-[#805b32] px-[30px] py-2.5 text-base font-medium text-white transition-[color,background-color,border-color] duration-100 hover:border-[#0a0f0b] hover:bg-[#1f2d22]',
		mobile && 'flex w-full items-center justify-center px-4'
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
			{mobile ? (
				<>
					<Link
						href="/account"
						className="flex w-full items-center justify-center px-4 py-2 text-sm font-medium text-white underline"
						onClick={onNavigate}
					>
						Account
					</Link>
					<form action={signOut} className="w-full">
						<button
							type="submit"
							className="flex w-full items-center justify-center px-4 py-2 text-sm font-medium text-white/90"
						>
							Sign out
						</button>
					</form>
				</>
			) : (
				<>
					<Link
						href="/account"
						className="rounded-[2px] border border-[#634627] px-3 py-2 text-sm font-medium text-[#805b32] hover:bg-[#f7f2ec]"
					>
						Account
					</Link>
					<form action={signOut}>
						<button
							type="submit"
							className="rounded-[2px] px-2 py-2 text-sm font-medium text-[#805b32] underline-offset-2 hover:underline"
						>
							Sign out
						</button>
					</form>
				</>
			)}
		</div>
	);
}
