'use client';

import ImageLightbox, {
	type LightboxImage
} from '@/components/blog/image-lightbox';
import { BlogBlocksImage } from '@/tina/__generated__/types';
import Image from 'next/image';
import { useState } from 'react';
import { tinaField } from 'tinacms/tina-field';

export default function BlogImage(props: BlogBlocksImage) {
	const [open, setOpen] = useState(false);

	if (!props.image) {
		return (
			<section className="bg-white px-4 py-8 sm:px-6 lg:px-8">
				<figure className="mx-auto max-w-3xl">
					<div
						data-tina-field={tinaField(props, 'image')}
						className="flex aspect-video w-full items-center justify-center border border-dashed border-[#c4b5a4] bg-[#f7f4ef] text-center font-heading text-sm text-[#888888]"
					>
						Add image
					</div>
				</figure>
			</section>
		);
	}

	const images: LightboxImage[] = [
		{
			src: props.image,
			alt: props.alt || undefined,
			caption: props.caption || undefined
		}
	];

	return (
		<section className="bg-white px-4 py-8 sm:px-6 lg:px-8">
			<figure className="mx-auto max-w-3xl">
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="group block w-full cursor-zoom-in overflow-hidden text-left"
					aria-label="View image larger"
					data-tina-field={tinaField(props, 'image')}
				>
					<span className="block origin-center scale-100 transition-transform duration-500 ease-in-out will-change-transform group-hover:scale-105">
						<Image
							src={props.image}
							alt={props.alt || props.caption || ''}
							className="w-full object-cover transition-[filter] duration-500 ease-in-out group-hover:brightness-[1.2]"
							width={770}
							height={449}
							sizes="(min-width: 860px) 770px, 92.41vw"
						/>{' '}
					</span>
				</button>
				{props.caption ? (
					<figcaption
						data-tina-field={tinaField(props, 'caption')}
						className="mt-3 text-center font-heading text-sm text-[#666666]"
					>
						{props.caption}
					</figcaption>
				) : null}
			</figure>

			<ImageLightbox
				images={images}
				index={0}
				open={open}
				onClose={() => setOpen(false)}
				onIndexChange={() => {}}
			/>
		</section>
	);
}
