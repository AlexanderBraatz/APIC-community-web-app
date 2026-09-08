'use client';

import { BlogBlocksRichText } from '@/tina/__generated__/types';
import { Components, TinaMarkdown } from 'tinacms/dist/rich-text';
import { tinaField } from 'tinacms/tina-field';

export default function BlogRichText(props: BlogBlocksRichText) {
	return (
		<section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-3xl">
				{props.heading ? (
					<h2
						data-tina-field={tinaField(props, 'heading')}
						className="font-heading mb-6 text-2xl font-normal text-[#333333] sm:text-3xl"
					>
						{props.heading}
					</h2>
				) : null}

				{props.body ? (
					<div
						data-tina-field={tinaField(props, 'body')}
						className="font-sans text-left text-lg leading-[1.75] text-[#333333]"
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
									),
									h3: pProps => (
										<h3
											className="font-heading mb-4 mt-8 text-xl text-[#333333]"
											{...pProps}
										/>
									)
								} satisfies Components<object>
							}
						/>
					</div>
				) : null}
			</div>
		</section>
	);
}
