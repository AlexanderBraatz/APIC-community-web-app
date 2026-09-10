'use client';

import { PageBlocksCommunityFeatures } from '@/tina/__generated__/types';
import { FileText, Heart, Mic, Users, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { tinaField } from 'tinacms/tina-field';

const FEATURE_ICONS: Record<string, LucideIcon> = {
	Users,
	Mic,
	Heart,
	FileText
};

export default function CommunityFeatures(props: PageBlocksCommunityFeatures) {
	return (
		<section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-[100px]">
			<div className="mx-auto max-w-[1400px]">
				<h2
					data-tina-field={tinaField(props, 'title')}
					className="font-heading mb-10 text-center text-4xl font-medium text-[#7A5A32] sm:mb-12 sm:text-5xl"
				>
					{props.title}
				</h2>

				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[30px]">
					{props.features?.map((feature, i) => {
						if (!feature) return null;
						const Icon =
							feature.icon && feature.icon in FEATURE_ICONS
								? FEATURE_ICONS[feature.icon]
								: Users;

						return (
							<article
								key={i}
								data-tina-field={tinaField(feature)}
								className="flex flex-col overflow-hidden border border-[#7A5A32]/15 bg-white"
							>
								<div className="flex flex-1 flex-col px-6 pt-8 pb-6 text-center">
									<div
										data-tina-field={tinaField(feature, 'icon')}
										className="mx-auto mb-5 text-[#7A5A32]"
									>
										<Icon
											className="size-10"
											strokeWidth={1.25}
										/>
									</div>
									<h3
										data-tina-field={tinaField(feature, 'label')}
										className="font-heading text-xl font-semibold text-[#5D4325]"
									>
										{feature.label}
									</h3>
									<p
										data-tina-field={tinaField(feature, 'description')}
										className="mt-3 text-sm leading-relaxed text-[#444444]"
									>
										{feature.description}
									</p>
								</div>
								{feature.image ? (
									<div className="relative h-40 w-full shrink-0 overflow-hidden">
										<Image
											width={325}
											height={160}
											sizes="(min-width: 1560px) 326px, (min-width: 1240px) calc(18.67vw + 39px), (min-width: 1040px) calc(11.11vw + 129px), (min-width: 640px) calc(50vw - 42px), calc(100vw - 34px)"
											src={feature.image}
											alt=""
											className="size-full object-cover"
											data-tina-field={tinaField(feature, 'image')}
										/>
									</div>
								) : null}
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
