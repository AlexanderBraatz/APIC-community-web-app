'use client';

import { PageBlocksTextSection } from '@/tina/__generated__/types';
import { Components, TinaMarkdown } from 'tinacms/dist/rich-text';
import { tinaField } from 'tinacms/tina-field';

export default function TextSection(props: PageBlocksTextSection) {
	return (
		<section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
			<div className="mx-auto max-w-[1400px]">
				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading mb-10 text-center text-3xl font-normal text-[#333333] sm:text-4xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				<div
					data-tina-field={tinaField(props, 'body')}
					className="mx-auto max-w-4xl font-heading text-left text-lg leading-[1.75] text-[#333333]"
				>
					<TinaMarkdown
						content={props.body}
						components={
							{
								p: pProps => (
									<p
										className="mb-5 last:mb-0"
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
			</div>
		</section>
	);
}
