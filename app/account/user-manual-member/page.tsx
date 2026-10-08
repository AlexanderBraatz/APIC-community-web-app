import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { PdfFileIcon } from '@/components/icons/pdf-file-icon';
import { UserManualMarkdown } from '@/components/docs/user-manual-markdown';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

type PageProps = {
	searchParams: Promise<{ from?: string }>;
};

export default async function UserManualMemberPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const fromInviteOnboarding = params.from === 'invite';
	const markdown = await readFile(
		path.join(process.cwd(), 'docs', 'USER_MANUAL_MEMBER.md'),
		'utf8'
	);

	return (
		<main className="mx-auto w-full max-w-3xl min-h-[100vh] px-4 py-12">
			{fromInviteOnboarding ? (
				<div className="mb-8 space-y-3 border-b border-[#e5e5e5] pb-6">
					<h1 className="font-heading text-3xl text-[#805b32]">
						Welcome — here is your member manual
					</h1>
					<p className="text-sm text-[#666]">
						Read the guide below (or download the PDF), then continue to
						the members hub when you are ready. You can always find this
						manual again later on your account page.
					</p>
					<div className="flex flex-wrap items-center gap-3">
						<Link
							href="/place"
							className={cn(
								buttonVariants({ variant: 'default' }),
								'text-base'
							)}
						>
							Continue to members hub
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
				</div>
			) : (
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
			)}

			<article>
				<UserManualMarkdown markdown={markdown} />
			</article>
		</main>
	);
}
