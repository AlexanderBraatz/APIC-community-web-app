'use client';

import { PageQuery } from '@/tina/__generated__/types';
import AboutSection from './about-section';
import CommunityFeatures from './community-features';
import CategoryGrid from './category-grid';
import CtaSection from './cta-section';
import EventListing from './event-listing';
import FeatureList from './feature-list';
import HeroBanner from './hero-banner';
import MemberIntro from './member-intro';
import QuoteBanner from './quote-banner';
import WelcomeHero from './welcome-hero';
import { useTina } from 'tinacms/react';

export default function PageContent(props: {
	data: PageQuery;
	variables: { relativePath: string };
	query: string;
}) {
	const { data } = useTina(props);
	return (
		<main>
			{data.page.blocks?.map((block, i) => {
				switch (block?.__typename) {
					case 'PageBlocksHeroBanner': {
						return (
							<HeroBanner
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksCommunityFeatures': {
						return (
							<CommunityFeatures
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksQuoteBanner': {
						return (
							<QuoteBanner
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksMemberIntro': {
						return (
							<MemberIntro
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksCategoryGrid': {
						return (
							<CategoryGrid
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksCtaSection': {
						return (
							<CtaSection
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksEventListing': {
						return (
							<EventListing
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksAboutSection': {
						return (
							<AboutSection
								key={i}
								{...block}
							/>
						);
					}
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
					default:
						return null;
				}
			})}
		</main>
	);
}
