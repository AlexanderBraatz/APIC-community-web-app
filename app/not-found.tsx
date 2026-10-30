import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
	title: 'Page not found · APIC Owners Community',
	description: 'This page could not be found.'
};

export default function NotFound() {
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-lg flex-1 flex-col items-center px-4 pt-[25vh] pb-24 text-center">
			<p className="font-heading text-7xl tracking-[0.12em] text-[#805b32]/70 uppercase sm:text-8xl">
				404
			</p>
			<h1 className="mt-4 font-heading text-3xl text-[#805b32] sm:text-4xl">
				Page not found
			</h1>
			<p className="mt-4 max-w-sm text-sm leading-relaxed text-[#666]">
				This address isn&apos;t on the site. It may have moved, or the link
				might be out of date.
			</p>
			<Link
				href="/"
				className={cn(
					buttonVariants({ variant: 'default', size: 'lg' }),
					'mt-10 gap-1.5'
				)}
			>
				<ArrowLeft className="size-4" aria-hidden="true" />
				Back to home
			</Link>
		</main>
	);
}
