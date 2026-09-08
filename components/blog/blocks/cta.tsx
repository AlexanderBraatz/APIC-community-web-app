'use client';

import { BlogBlocksCta } from '@/tina/__generated__/types';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';

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
						className="mt-6 inline-flex rounded-[2px] border border-[#634627] bg-[#805b32] px-6 py-3 text-base font-medium text-white transition-[color,background-color,border-color] duration-100 hover:border-[#0a0f0b] hover:bg-[#1f2d22]"
					>
						{props.buttonLabel}
					</Link>
				) : null}
			</div>
		</section>
	);
}
