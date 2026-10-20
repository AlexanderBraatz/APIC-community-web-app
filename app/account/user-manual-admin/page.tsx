import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PdfFileIcon } from '@/components/icons/pdf-file-icon';
import { UserManualAccordion } from '@/components/docs/user-manual-accordion';
import { buttonVariants } from '@/components/ui/button-variants';
import { requireAdmin } from '@/lib/admin/require-admin';
import { cn } from '@/lib/utils';

export default async function UserManualAdminPage() {
	try {
		await requireAdmin();
	} catch {
		redirect('/account/user-manual-member');
	}

	const markdown = await readFile(
		path.join(process.cwd(), 'docs', 'USER_MANUAL_ADMIN.md'),
		'utf8'
	);

	return (
		<main className="mx-auto w-full max-w-3xl min-h-[100vh] px-4 py-12">
			<div className="mb-8 flex flex-wrap items-center gap-3">
				<Link
					href="/members/admin"
					className={cn(buttonVariants({ variant: 'outline' }), 'text-base')}
				>
					Back to admin board
				</Link>
				<a
					href="/docs/apic-community-admin-manual.pdf"
					download
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'inline-flex items-center gap-2 text-base'
					)}
				>
					<PdfFileIcon className="size-4 shrink-0" />
					Download PDF
				</a>
			</div>

			<article>
				<UserManualAccordion markdown={markdown} />
			</article>
		</main>
	);
}
