'use client';

import { PageBlocksSectionHeading } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';
import StarDivider from './star-divider';

export default function SectionHeading(props: PageBlocksSectionHeading) {
	return (
		<section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-[1400px]">
				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading text-4xl font-normal text-[#333333] sm:text-5xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				<StarDivider />
			</div>
		</section>
	);
}
