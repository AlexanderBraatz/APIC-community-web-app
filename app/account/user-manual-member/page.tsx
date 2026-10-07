import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { UserManualMarkdown } from '@/components/docs/user-manual-markdown';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export default async function UserManualMemberPage() {
	const markdown = await readFile(
		path.join(process.cwd(), 'docs', 'USER_MANUAL_MEMBER.md'),
		'utf8'
	);

	return (
		<main className="mx-auto w-full max-w-3xl min-h-[100vh] px-4 py-12">
			<div className="mb-8 flex flex-wrap items-center gap-3">
				<Link
					href="/account"
					className={cn(buttonVariants({ variant: 'outline' }), 'text-base')}
				>
					Back to account
				</Link>
				<a
					href="/docs/apic-community-member-manual.pdf"
					download
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'inline-flex items-center gap-2 text-base'
					)}
				>
					<FileText className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
					Download PDF
				</a>
			</div>

			<article>
				<UserManualMarkdown markdown={markdown} />
			</article>
		</main>
	);
}
