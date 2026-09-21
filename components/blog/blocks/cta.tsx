'use client';

import { BlogBlocksCta } from '@/tina/__generated__/types';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function BlogCta(props: BlogBlocksCta) {
	return (
		<section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-3xl">
				{props.title ? (
					<h2
						data-tina-field={tinaField(props, 'title')}
						className="font-heading text-2xl font-medium text-[#5D4325] sm:text-3xl"
					>
						{props.title}
					</h2>
				) : null}

				{props.description ? (
					<p
						data-tina-field={tinaField(props, 'description')}
						className="mt-4 font-sans text-base leading-relaxed text-[#444444] sm:text-lg"
					>
						{props.description}
					</p>
				) : null}

				{props.buttonLabel ? (
					<Link
						href={props.buttonLink || '#'}
						data-tina-field={tinaField(props, 'buttonLabel')}
						className={cn(
							buttonVariants({ variant: 'default', size: 'lg' }),
							'mt-6 w-full sm:w-auto'
						)}
					>
						{props.buttonLabel}
					</Link>
				) : null}
			</div>
		</section>
	);
}
