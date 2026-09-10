'use client';

import ImageLightbox, {
	type LightboxImage
} from '@/components/blog/image-lightbox';
import { BlogBlocksImageGallery } from '@/tina/__generated__/types';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { tinaField } from 'tinacms/tina-field';

export default function BlogImageGallery(props: BlogBlocksImageGallery) {
	const [open, setOpen] = useState(false);
	const [index, setIndex] = useState(0);

	const entries = useMemo(() => {
		const list: {
			image: LightboxImage;
			item: NonNullable<NonNullable<BlogBlocksImageGallery['images']>[number]>;
		}[] = [];
		for (const item of props.images ?? []) {
			if (!item?.image) continue;
			list.push({
				item,
				image: {
					src: item.image,
					alt: item.alt || undefined
				}
			});
		}
		return list;
	}, [props.images]);

	const images = useMemo(() => entries.map(entry => entry.image), [entries]);

	if (images.length === 0) {
		// Focus the whole block — not `images`. Tina's FormBuilder crashes when
		// visual-editing into an object-list field that is still undefined/empty.
		return (
			<section className="bg-white px-4 py-8 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl">
					<div
						data-tina-field={tinaField(props)}
						className="flex aspect-video w-full items-center justify-center border border-dashed border-[#c4b5a4] bg-[#f7f4ef] text-center font-heading text-sm text-[#888888]"
					>
						Add images
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="bg-white px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-3xl">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{entries.map(({ item, image }, i) => (
						<button
							key={`${image.src}-${i}`}
							type="button"
							className="group cursor-zoom-in overflow-hidden text-left"
							aria-label="View image larger"
							data-tina-field={tinaField(item)}
							onClick={() => {
								setIndex(i);
								setOpen(true);
							}}
						>
							<span className="block origin-center scale-100 transition-transform duration-500 ease-in-out will-change-transform group-hover:scale-105">
								<Image
									src={image.src}
									alt={image.alt || ''}
									className="aspect-4/3 size-full object-cover transition-[filter] duration-500 ease-in-out group-hover:brightness-[1.2]"
									data-tina-field={tinaField(item, 'image')}
									width={378}
									height={283}
									sizes="(min-width: 880px) 379px, (min-width: 640px) calc(40vw + 35px), calc(100vw - 32px)"
								/>
							</span>
						</button>
					))}
				</div>
			</div>

			<ImageLightbox
				images={images}
				index={index}
				open={open}
				onClose={() => setOpen(false)}
				onIndexChange={setIndex}
			/>
		</section>
	);
}
