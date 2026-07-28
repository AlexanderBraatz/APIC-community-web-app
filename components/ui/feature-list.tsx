'use client';
import { FeaturedIcons } from '@/components/icons';
import { PageBlocksFeatureList } from '@/tina/__generated__/types';
import { Components, TinaMarkdown } from 'tinacms/dist/rich-text';
import { tinaField } from 'tinacms/tina-field';

import Byline from './by-line';

export default function FeatureList(props: PageBlocksFeatureList) {
	return (
		<section>
			<div className="px-4 py-8 text-center">
				<Byline fieldName={tinaField(props, 'byline')}>{props.byline}</Byline>
				<div data-tina-field={tinaField(props, 'message')}>
					<TinaMarkdown
						content={props.message}
						components={
							{
								h1: props => (
									<h1
										className="mx-auto text-5xl font-extrabold leading-tight tracking-tighter text-primary md:text-7xl"
										{...props}
									/>
								),
								bold: props => (
									<span
										className="bg-gradient-to-b from-blue-300 to-pink-600 bg-clip-text text-transparent"
										{...props}
									/>
								),
								p: props => (
									<p
										className="mx-auto mt-8 max-w-[700px] px-2 text-center text-xl text-muted-foreground"
										{...props}
									/>
								)
							} satisfies Components<object>
						}
					/>
				</div>
				<div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{props.features?.map((feature, i) => {
						if (!feature) return null;
						const Icon =
							feature.icon && feature.icon in FeaturedIcons
								? FeaturedIcons[feature.icon as keyof typeof FeaturedIcons]
								: null;
						const isButton = feature.style === 'button';

						return (
							<div
								key={i}
								data-tina-field={tinaField(feature)}
								className={
									isButton
										? 'rounded-xl border border-border bg-card p-6 text-left shadow-sm'
										: 'rounded-xl border border-transparent bg-muted/60 p-6 text-left'
								}
							>
								{Icon ? (
									<div
										data-tina-field={tinaField(feature, 'icon')}
										className="mb-4 size-16 [&_svg]:size-full"
									>
										<Icon />
									</div>
								) : null}
								<h3
									data-tina-field={tinaField(feature, 'label')}
									className="text-lg font-semibold text-foreground"
								>
									{feature.label}
								</h3>
								<p
									data-tina-field={tinaField(feature, 'description')}
									className="mt-2 text-sm text-muted-foreground"
								>
									{feature.description}
								</p>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
