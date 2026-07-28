'use client';

import { PageBlocksHeroBanner } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';

export default function HeroBanner(props: PageBlocksHeroBanner) {
	return (
		<section className="relative min-h-[70vh] w-full overflow-hidden">
			{props.backgroundVideo ? (
				<video
					src={props.backgroundVideo}
					autoPlay
					loop
					muted
					playsInline
					poster={props.backgroundImage ?? undefined}
					className="absolute inset-0 size-full object-cover"
					data-tina-field={tinaField(props, 'backgroundVideo')}
				/>
			) : props.backgroundImage ? (
				<img
					src={props.backgroundImage}
					alt=""
					className="absolute inset-0 size-full object-cover"
					data-tina-field={tinaField(props, 'backgroundImage')}
				/>
			) : (
				<div className="absolute inset-0 bg-[#7A5A32]" />
			)}
			<div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/35" />
			<div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-4 text-center text-white">
				<h1
					data-tina-field={tinaField(props, 'heading')}
					className="font-heading text-[40px] font-medium leading-tight tracking-wide sm:text-5xl lg:text-[68px]"
				>
					{props.heading}
				</h1>
				<p
					data-tina-field={tinaField(props, 'subtitle')}
					className="font-heading mt-4 max-w-2xl text-lg italic sm:text-2xl lg:text-[26px]"
				>
					{props.subtitle}
				</p>
			</div>
		</section>
	);
}
