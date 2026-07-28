'use client';
import { PageQuery } from '@/tina/__generated__/types';

import WelcomeHero from './welcome-hero';
import { useTina } from 'tinacms/react';
import FeatureList from './feature-list';

export default function PageContent(props: {
	data: PageQuery;
	variables: { relativePath: string };
	query: string;
}) {
	const { data } = useTina(props);
	return (
		<div>
			{data.page.blocks?.map((block, i) => {
				switch (block?.__typename) {
					case 'PageBlocksWelcomeHero': {
						return (
							<WelcomeHero
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksFeatureList': {
						return (
							<FeatureList
								key={i}
								{...block}
							/>
						);
					}
				}
			})}
		</div>
	);
}
