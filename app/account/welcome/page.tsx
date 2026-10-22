import Link from 'next/link';
import { WELCOME_PAGE_COPY } from '@/components/account/welcome-page-copy';
import { INVITE_LANGUAGE_STEP_COPY } from '@/components/auth/invite-language-step-copy';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export default async function AccountWelcomePage() {
	// Always English — official platform language; manuals may differ after this.
	const copy = WELCOME_PAGE_COPY.en;
	const languageNotices = INVITE_LANGUAGE_STEP_COPY.en;

	return (
		<main className="mx-auto w-full max-w-lg min-h-[100vh] px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">{copy.heading}</h1>
			<p className="mt-4 text-base leading-relaxed text-[#444]">
				{copy.benefits}
			</p>

			<section className="mt-10 space-y-3 border-t border-[#e5e5e5] pt-8">
				<h2 className="mb-5 font-heading text-2xl text-[#805b32]">
					{copy.helpHeading}
				</h2>
				<div className="space-y-2" role="status">
					<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
						{languageNotices.noticeOfficial}
					</p>
					<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
						{languageNotices.noticeHelp}
					</p>
				</div>
			</section>

			<div className="mt-8">
				<Link
					href="/place"
					className={cn(
						buttonVariants({ variant: 'default' }),
						'w-full text-base'
					)}
				>
					{copy.continue}
				</Link>
			</div>
		</main>
	);
}
