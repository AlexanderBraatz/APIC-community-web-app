'use client';

import { PageBlocksMemberIntro } from '@/tina/__generated__/types';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { Components, TinaMarkdown } from 'tinacms/dist/rich-text';
import { tinaField } from 'tinacms/tina-field';

export default function MemberIntro(props: PageBlocksMemberIntro) {
	return (
		<section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-[1400px]">
				<div
					data-tina-field={tinaField(props, 'body')}
					className="font-heading text-lg leading-relaxed text-[#444444] sm:text-xl"
				>
					<TinaMarkdown
						content={props.body}
						components={
							{
								p: pProps => (
									<p
										className="mb-6 last:mb-0"
										{...pProps}
									/>
								),
								bold: pProps => (
									<strong
										className="font-semibold text-[#5D4325]"
										{...pProps}
									/>
								)
							} satisfies Components<object>
						}
					/>
				</div>

				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading mt-12 text-3xl font-medium text-[#5D4325] sm:text-4xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				{props.actions && props.actions.length > 0 ? (
					<div className="mt-8 flex flex-wrap gap-4">
						{props.actions.map((action, i) => {
							if (!action?.label) return null;

							return (
								<Link
									key={i}
									href={action.link || '#'}
									data-tina-field={tinaField(action)}
									className="inline-flex items-center gap-2 rounded-[2px] border border-[#634627] bg-[#805b32] px-6 py-3 text-base font-medium text-white transition-[color,background-color,border-color] duration-100 hover:border-[#0a0f0b] hover:bg-[#1f2d22]"
								>
									<Users className="size-5" strokeWidth={1.5} />
									{action.label}
								</Link>
							);
						})}
					</div>
				) : null}
			</div>
		</section>
	);
}
