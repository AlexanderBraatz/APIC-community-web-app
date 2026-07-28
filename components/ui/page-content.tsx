'use client';

import { PageQuery } from '@/tina/__generated__/types';
import ButtonList from './button-list';
import CommunityFeatures from './community-features';
import ImageCaptionList from './image-caption-list';
import ImageGallery from './image-gallery';
import CategoryGrid from './category-grid';
import CtaSection from './cta-section';
import EventListing from './event-listing';
import SectionHeading from './section-heading';
import HeroBanner from './hero-banner';
import QuoteBanner from './quote-banner';
import TextSection from './text-section';
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
					case 'PageBlocksButtonList': {
						return (
							<ButtonList
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
					case 'PageBlocksSectionHeading': {
						return (
							<SectionHeading
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksTextSection': {
						return (
							<TextSection
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksImageCaptionList': {
						return (
							<ImageCaptionList
								key={i}
								{...block}
							/>
						);
					}
					case 'PageBlocksImageGallery': {
						return (
							<ImageGallery
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
