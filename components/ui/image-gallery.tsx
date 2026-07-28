'use client';

import { PageBlocksImageGallery } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';

export default function ImageGallery(props: PageBlocksImageGallery) {
	if (!props.images || props.images.length === 0) return null;

	return (
		<section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
			<div className="mx-auto max-w-[1400px]">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{props.images.map((item, i) => {
						if (!item?.image) return null;

						return (
							<div
								key={i}
								className="overflow-hidden"
								data-tina-field={tinaField(item)}
							>
								<img
									src={item.image}
									alt=""
									className="size-full object-cover"
									data-tina-field={tinaField(item, 'image')}
								/>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
