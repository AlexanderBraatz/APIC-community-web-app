import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { UserManualMarkdown } from '@/components/docs/user-manual-markdown';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export default async function UserManualsPage() {
	const markdown = await readFile(
		path.join(process.cwd(), 'docs', 'USER_MANUAL.md'),
		'utf8'
	);

	return (
		<main className="mx-auto w-full max-w-3xl min-h-[100vh] px-4 py-12">
			<div className="mb-8 flex flex-wrap items-center gap-3">
				<Link
					href="/account"
					className={cn(buttonVariants({ variant: 'outline' }), 'text-sm')}
				>
					Back to account
				</Link>
			</div>

			<article>
				<UserManualMarkdown markdown={markdown} />
			</article>
		</main>
	);
}
