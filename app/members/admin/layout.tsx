import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/require-admin';

export default async function MembersAdminLayout({
	children
}: {
	children: ReactNode;
}) {
	try {
		await requireAdmin();
	} catch {
		redirect('/place');
	}

	return (
		<div className="mx-auto w-full max-w-5xl px-4 py-10">
			<header className="mb-8 border-b border-[#e5e5e5] pb-4">
				<p className="text-xs tracking-wide text-[#888] uppercase">App admin</p>
				<h1 className="font-heading text-3xl text-[#805b32]">Members admin</h1>
				<nav className="mt-4 flex flex-wrap gap-4 text-sm">
					<Link href="/members/admin" className="text-[#805b32] underline">
						Dashboard
					</Link>
					<Link href="/members/admin/listings" className="text-[#805b32] underline">
						Listings
					</Link>
					<Link href="/members/admin/users" className="text-[#805b32] underline">
						Users
					</Link>
					<Link href="/members/admin/invitations" className="text-[#805b32] underline">
						Invitations
					</Link>
					<Link
						href="/members/admin/audit-log"
						className="text-[#805b32] underline"
					>
						Audit log
					</Link>
					<Link href="/place" className="text-[#666] underline">
						Back to members hub
					</Link>
				</nav>
			</header>
			{children}
		</div>
	);
}
