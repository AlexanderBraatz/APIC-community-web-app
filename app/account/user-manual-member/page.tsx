import Link from 'next/link';
import { PdfFileIcon } from '@/components/icons/pdf-file-icon';
import { UserManualAccordion } from '@/components/docs/user-manual-accordion';
import { buttonVariants } from '@/components/ui/button-variants';
import {
	getProfileManualLanguage,
	readManualMarkdown
} from '@/lib/docs/resolve-manual-source';
import { cn } from '@/lib/utils';

export default async function UserManualMemberPage() {
	const language = await getProfileManualLanguage();
	const markdown = await readManualMarkdown('member', language);

	return (
		<main className="mx-auto w-full max-w-3xl min-h-[100vh] px-4 py-12">
			<div className="mb-8 flex flex-wrap items-center gap-3">
				<Link
					href="/account"
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'text-base'
					)}
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
