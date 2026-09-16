'use client';

import { PageBlocksCtaSection } from '@/tina/__generated__/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';

const navButtonClassName =
	'group inline-flex w-full items-center justify-between gap-3 rounded-[2px] border border-[#634627] bg-[#805b32] px-6 py-3 text-base font-medium text-white transition-[color,background-color,border-color] duration-100 hover:border-[#0a0f0b] hover:bg-[#1f2d22] sm:w-72';

export default function CtaSection(props: PageBlocksCtaSection) {
	return (
		<section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-4xl">
				<h2
					data-tina-field={tinaField(props, 'title')}
					className="font-heading text-3xl font-medium text-[#5D4325] sm:text-4xl"
				>
					{props.title}
				</h2>

				{props.description ? (
					<p
						data-tina-field={tinaField(props, 'description')}
						className="mt-6 text-base leading-relaxed text-[#444444] sm:text-lg"
					>
						{props.description}
					</p>
				) : null}

				{props.buttonLabel ? (
					<div className="mt-8 flex justify-end">
						<Link
							href={props.buttonLink || '#'}
							data-tina-field={tinaField(props, 'buttonLabel')}
							className={navButtonClassName}
						>
							<span>{props.buttonLabel}</span>
							<ArrowRight
								className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
								strokeWidth={1.75}
								aria-hidden
							/>
						</Link>
					</div>
				) : null}
			</div>
		</section>
	);
}
