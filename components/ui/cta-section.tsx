'use client';

import { PageBlocksCtaSection } from '@/tina/__generated__/types';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';

export default function CtaSection(props: PageBlocksCtaSection) {
	return (
		<section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-[1400px]">
				<h2
					data-tina-field={tinaField(props, 'title')}
					className="font-heading text-3xl font-medium text-[#5D4325] sm:text-4xl"
				>
					{props.title}
				</h2>

				{props.description ? (
					<p
						data-tina-field={tinaField(props, 'description')}
						className="mt-6 max-w-3xl text-base leading-relaxed text-[#444444] sm:text-lg"
					>
						{props.description}
					</p>
				) : null}

				{props.buttonLabel ? (
					<Link
						href={props.buttonLink || '#'}
						data-tina-field={tinaField(props, 'buttonLabel')}
						className="mt-8 inline-flex rounded-[2px] border border-[#634627] bg-[#805b32] px-6 py-3 text-base font-medium text-white transition-[color,background-color,border-color] duration-100 hover:border-[#0a0f0b] hover:bg-[#1f2d22]"
					>
						{props.buttonLabel}
					</Link>
				) : null}
			</div>
		</section>
	);
}
