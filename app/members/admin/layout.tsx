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
				<h1 className="font-heading text-3xl text-[#805b32]">
					Admin Dashboard
				</h1>
				<nav className="mt-4 flex flex-wrap gap-4 text-sm">
					<Link
						href="/members/admin"
						className="text-[#805b32] underline"
					>
						Dashboard
					</Link>
					<Link
						href="/members/admin/listings"
						className="text-[#805b32] underline"
					>
						Recommendations
					</Link>
					<Link
						href="/members/admin/users"
						className="text-[#805b32] underline"
					>
						Members
					</Link>
					<Link
						href="/members/admin/invitations"
						className="text-[#805b32] underline"
					>
						Invitations
					</Link>
					<Link
						href="/members/admin/tags"
						className="text-[#805b32] underline"
					>
						Keywords
					</Link>
					<Link
						href="/members/admin/audit-log"
						className="text-[#805b32] underline"
					>
						Audit log
					</Link>
					<a
						href="/admin#/collections/blog/~"
						className="text-[#805b32] underline"
					>
						Blog admin
					</a>
					<a href="/admin#/~/place" className="text-[#805b32] underline">
						Content admin
					</a>
				</nav>
			</header>
			{children}
		</div>
	);
}
