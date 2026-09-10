'use client';

import { PageBlocksImageCaptionList } from '@/tina/__generated__/types';
import Image from 'next/image';
import { tinaField } from 'tinacms/tina-field';

export default function ImageCaptionList(props: PageBlocksImageCaptionList) {
	if (!props.items || props.items.length === 0) return null;

	return (
		<section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
			<div className="mx-auto max-w-[1400px]">
				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
					{props.items.map((item, i) => {
						if (!item?.caption) return null;

						return (
							<article
								key={i}
								data-tina-field={tinaField(item)}
								className="flex flex-col text-center"
							>
								{item.image ? (
									<div className="relative mx-auto aspect-[440/330] w-full max-w-[440px] overflow-hidden bg-[#f8f6f2]">
										<Image
											width={440}
											height={330}
											sizes="(min-width: 1540px) 440px, (min-width: 1060px) 28.26vw, (min-width: 1020px) calc(-680vw + 7376px), (min-width: 640px) 44.72vw, (min-width: 500px) 440px, calc(95.56vw - 17px)"
											src={item.image}
											alt=""
											className="absolute inset-0 size-full object-cover object-[center_20%]"
											data-tina-field={tinaField(item, 'image')}
										/>
									</div>
								) : (
									<div className="mx-auto aspect-[440/330] w-full max-w-[440px] bg-[#f8f6f2]" />
								)}
								<p
									data-tina-field={tinaField(item, 'caption')}
									className="font-heading mt-4 text-xl font-normal text-[#333333]"
								>
									{item.caption}
								</p>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
