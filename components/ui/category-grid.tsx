'use client';

import { PageBlocksCategoryGrid } from '@/tina/__generated__/types';
import Image from 'next/image';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';

export default function CategoryGrid(props: PageBlocksCategoryGrid) {
	return (
		<section className="bg-white px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
			<div className="mx-auto max-w-[1400px]">
				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading mb-12 text-center text-2xl font-medium leading-snug text-[#5D4325] sm:text-3xl lg:mb-16 lg:text-4xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
					{props.items?.map((item, i) => {
						if (!item?.title) return null;

						return (
							<Link
								key={i}
								href={item.link || '#'}
								data-tina-field={tinaField(item)}
								className="group block"
							>
								{item.image ? (
									<div className="relative aspect-[39/55] w-full overflow-hidden">
										<Image
											width={332}
											height={468}
											src={item.image}
											sizes="(min-width: 1540px) 932px, (min-width: 1040px) 62.08vw, (min-width: 640px) calc(138.95vw - 99px), calc(281.88vw - 90px)"
											alt=""
											className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
											data-tina-field={tinaField(item, 'image')}
										/>
									</div>
								) : (
									<div className="aspect-[39/55] w-full bg-[#F8F6F2]" />
								)}
								<h3
									data-tina-field={tinaField(item, 'title')}
									className="font-heading mt-4 text-xl font-medium text-[#5D4325] transition-colors group-hover:text-[#7A5A32]"
								>
									{item.title}
								</h3>
							</Link>
						);
					})}
				</div>
			</div>
		</section>
	);
}
