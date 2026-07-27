import { PageQuery } from '@/tina/__generated__/types';
import React from 'react';
import WelcomeHero from './welcome-hero';

export default function PageContent(props: {
	data: PageQuery;
	variables: { relativePath: string };
	query: string;
}) {
	return (
		<div>
			{props.data.page.blocks?.map((block, i) => {
				switch (block?.__typename) {
					case 'PageBlocksWelcomeHero': {
						return (
							<WelcomeHero
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
