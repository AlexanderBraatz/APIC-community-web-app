'use client';

import { PageBlocksMockMap } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';

const DEFAULT_MAP_IMAGE = '/images/mock-map.svg';

export default function MockMap(props: PageBlocksMockMap) {
	const src = props.image ?? DEFAULT_MAP_IMAGE;

	return (
		<section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
			<div className="mx-auto max-w-[1400px]">
				<div
					className="overflow-hidden rounded-sm border border-[#b8a99a]/40 bg-[#e8e4dc]"
					data-tina-field={tinaField(props, 'image')}
				>
					<img
						src={src}
						alt="Map"
						className="aspect-[2/1] w-full object-cover"
					/>
				</div>
			</div>
		</section>
	);
}
