'use client';

import { PageBlocksButtonList } from '@/tina/__generated__/types';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';

export default function ButtonList(props: PageBlocksButtonList) {
	if (!props.buttons || props.buttons.length === 0) return null;

	return (
		<section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
			<div className="mx-auto max-w-[1400px]">
				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading text-3xl font-medium text-[#5D4325] sm:text-4xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				<div className="mt-8 flex flex-wrap gap-4">
					{props.buttons.map((button, i) => {
						if (!button?.label) return null;

						return (
							<Link
								key={i}
								href={button.link || '#'}
								data-tina-field={tinaField(button)}
								className="inline-flex items-center gap-2 rounded-[2px] border border-[#634627] bg-[#805b32] px-6 py-3 text-base font-medium text-white transition-[color,background-color,border-color] duration-100 hover:border-[#0a0f0b] hover:bg-[#1f2d22]"
							>
								<Users className="size-5" strokeWidth={1.5} />
								{button.label}
							</Link>
						);
					})}
				</div>
			</div>
		</section>
	);
}
