'use client';

import { PageBlocksQuoteBanner } from '@/tina/__generated__/types';
import Image from 'next/image';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function QuoteBanner(props: PageBlocksQuoteBanner) {
	return (
		<section className="relative min-h-[70vh] w-full overflow-hidden">
			{props.backgroundImage ? (
				<Image
					fill
					sizes="100vw"
					src={props.backgroundImage}
					alt=""
					className="absolute inset-0 size-full object-cover"
					data-tina-field={tinaField(props, 'backgroundImage')}
				/>
			) : (
				<div className="absolute inset-0 bg-[#5D4325]" />
			)}
			<div
				className="absolute inset-0"
				style={{ backgroundColor: 'rgba(62, 77, 70, 0.44)' }}
			/>
			<div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-4 text-center text-white">
				<p
					data-tina-field={tinaField(props, 'intro')}
					className="font-heading max-w-3xl text-base italic sm:text-lg lg:text-xl"
				>
					{props.intro}
				</p>
				<h2
					data-tina-field={tinaField(props, 'heading')}
					className="font-heading mt-3 max-w-3xl text-2xl font-semibold sm:text-3xl lg:text-4xl"
				>
					{props.heading}
				</h2>
				{props.buttonLabel ? (
					<Link
						href={props.buttonLink || '#'}
						data-tina-field={tinaField(props, 'buttonLabel')}
						className={cn(
							buttonVariants({ variant: 'outline' }),
							'mt-8 w-full border-white bg-white text-[#444444] hover:bg-[#F8F6F2] sm:w-auto'
						)}
					>
						{props.buttonLabel}
					</Link>
				) : null}
			</div>
		</section>
	);
}
