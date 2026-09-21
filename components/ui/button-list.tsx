'use client';

import { PageBlocksButtonList } from '@/tina/__generated__/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ButtonList(props: PageBlocksButtonList) {
	if (!props.buttons || props.buttons.length === 0) return null;

	return (
		<section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-4xl">
				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading text-3xl font-medium text-[#5D4325] sm:text-4xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				{props.description ? (
					<p
						data-tina-field={tinaField(props, 'description')}
						className="mt-6 text-base leading-relaxed text-[#444444] sm:text-lg"
					>
						{props.description}
					</p>
				) : null}

				<div className="mt-8 flex flex-wrap justify-end gap-4">
					{props.buttons.map((button, i) => {
						if (!button?.label) return null;

						return (
							<Link
								key={i}
								href={button.link || '#'}
								data-tina-field={tinaField(button)}
								className={cn(
									buttonVariants({ variant: 'default', size: 'lg' }),
									'group w-full justify-between sm:w-72'
								)}
							>
								<span>{button.label}</span>
								<ArrowRight
									className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
									strokeWidth={1.75}
									aria-hidden
								/>
							</Link>
						);
					})}
				</div>
			</div>
		</section>
	);
}
