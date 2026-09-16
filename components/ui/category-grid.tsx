'use client';

import { PageBlocksCategoryGrid } from '@/tina/__generated__/types';
import Image from 'next/image';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';

export default function CategoryGrid(props: PageBlocksCategoryGrid) {
	return (
		<section className="bg-[#eeeae4] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-[1400px]">
				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading mb-12 text-left text-2xl font-medium leading-snug text-[#5D4325] sm:text-3xl lg:mb-16 lg:text-4xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
					{props.items?.map((item, i) => {
						if (!item?.title) return null;

						const href = item.link || '#';
						const buttonLabel = item.buttonLabel || item.title;

						return (
							<Link
								key={i}
								href={href}
								data-tina-field={tinaField(item)}
								className="group flex flex-col"
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

								<span
									data-tina-field={tinaField(item, 'buttonLabel')}
									className="mt-4 inline-flex w-full items-center justify-center rounded-[2px] border border-[#634627] bg-[#805b32] px-4 py-2.5 text-center text-sm font-medium text-white transition-[color,background-color,border-color] duration-100 group-hover:border-[#0a0f0b] group-hover:bg-[#1f2d22]"
								>
									{buttonLabel}
								</span>

								{item.description ? (
									<p
										data-tina-field={tinaField(item, 'description')}
										className="mt-3 text-sm leading-relaxed text-[#444444]"
									>
										{item.description}
									</p>
								) : null}
							</Link>
						);
					})}
				</div>
			</div>
		</section>
	);
}
