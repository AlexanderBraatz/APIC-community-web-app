'use client';

import { PageBlocksQuoteBanner } from '@/tina/__generated__/types';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';

export default function QuoteBanner(props: PageBlocksQuoteBanner) {
	return (
		<section className="relative min-h-[70vh] w-full overflow-hidden">
			{props.backgroundImage ? (
				<img
					src={props.backgroundImage}
					alt=""
					className="absolute inset-0 size-full object-cover"
					data-tina-field={tinaField(props, 'backgroundImage')}
				/>
			) : (
				<div className="absolute inset-0 bg-[#5D4325]" />
			)}
			<div
				className="absolute inset-0"
				style={{ backgroundColor: 'rgba(62, 77, 70, 0.44)' }}
			/>
			<div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-4 text-center text-white">
				<p
					data-tina-field={tinaField(props, 'intro')}
					className="font-heading max-w-3xl text-base italic sm:text-lg lg:text-xl"
				>
					{props.intro}
				</p>
				<h2
					data-tina-field={tinaField(props, 'heading')}
					className="font-heading mt-3 max-w-3xl text-2xl font-semibold sm:text-3xl lg:text-4xl"
				>
					{props.heading}
				</h2>
				{props.buttonLabel ? (
					<Link
						href={props.buttonLink || '#'}
						data-tina-field={tinaField(props, 'buttonLabel')}
						className="mt-8 inline-flex bg-white px-5 py-2.5 text-sm font-medium text-[#444444] transition-colors hover:bg-[#F8F6F2]"
					>
						{props.buttonLabel}
					</Link>
				) : null}
			</div>
		</section>
	);
}
