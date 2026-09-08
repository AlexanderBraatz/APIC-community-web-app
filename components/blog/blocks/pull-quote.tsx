'use client';

import { BlogBlocksPullQuote } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';

export default function BlogPullQuote(props: BlogBlocksPullQuote) {
	if (!props.quote) return null;

	return (
		<section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
			<blockquote className="mx-auto max-w-2xl border-l-2 border-[#805b32] pl-6 sm:pl-8">
				<p
					data-tina-field={tinaField(props, 'quote')}
					className="font-heading text-xl leading-relaxed text-[#5D4325] sm:text-2xl"
				>
					{props.quote}
				</p>
				{props.attribution ? (
					<footer
						data-tina-field={tinaField(props, 'attribution')}
						className="mt-4 text-sm text-[#666666]"
					>
						— {props.attribution}
					</footer>
				) : null}
			</blockquote>
		</section>
	);
}
