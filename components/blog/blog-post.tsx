'use client';

import BlogCta from '@/components/blog/blocks/cta';
import BlogDivider from '@/components/blog/blocks/divider';
import BlogEmbed from '@/components/blog/blocks/embed';
import BlogImage from '@/components/blog/blocks/image';
import BlogImageGallery from '@/components/blog/blocks/image-gallery';
import BlogMap from '@/components/blog/blocks/map';
import BlogPullQuote from '@/components/blog/blocks/pull-quote';
import BlogRichText from '@/components/blog/blocks/rich-text';
import { BlogQuery } from '@/tina/__generated__/types';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { tinaField } from 'tinacms/tina-field';
import { useTina } from 'tinacms/react';
import { useEffect } from 'react';
import {
	AnalyticsEvents,
	useAnalytics
} from '@/components/analytics/posthog-provider';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type BlogNeighbor = {
	slug: string;
	title: string;
};

function formatPublishedAt(value?: string | null) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

const lightButtonClassName = cn(buttonVariants({ variant: 'outline' }), 'gap-1.5');
const lightButtonDisabledClassName = cn(
	buttonVariants({ variant: 'outline' }),
	'cursor-not-allowed gap-1.5 opacity-50'
);

export default function BlogPost({
	previousPost,
	nextPost,
	...tinaProps
}: {
	previousPost?: BlogNeighbor | null;
	nextPost?: BlogNeighbor | null;
	data: BlogQuery;
	variables: { relativePath: string };
	query: string;
}) {
	const { data } = useTina(tinaProps);
	const post = data.blog;
	const { track } = useAnalytics();

	useEffect(() => {
		const slug = post._sys?.filename;
		if (slug) track(AnalyticsEvents.EVENT_OPENED, { content_id: slug });
	}, [post._sys?.filename, track]);
	const metaBits = [post.author, formatPublishedAt(post.publishedAt)].filter(
		Boolean
	);

	return (
		<article>
			<header className="bg-white px-4 pb-6 pt-6 sm:px-6 lg:px-8 lg:pt-8">
				<div className="mx-auto max-w-3xl">
					<nav
						aria-label="Blog post navigation"
						className="mb-8 flex items-center justify-between gap-2 sm:gap-3"
					>
						<Link
							href="/blog"
							className={lightButtonClassName}
						>
							<ArrowLeft
								className="size-4"
								aria-hidden="true"
							/>
							<span className="sm:hidden">Articles</span>
							<span className="hidden sm:inline">Back To Articles</span>
						</Link>
						<div className="flex items-center gap-2 sm:gap-3">
							{previousPost ? (
								<Link
									href={`/blog/${previousPost.slug}`}
									className={lightButtonClassName}
									aria-label={`Back to article: ${previousPost.title}`}
								>
									<ChevronLeft
										className="size-4"
										aria-hidden="true"
									/>
									Back
								</Link>
							) : (
								<span className={lightButtonDisabledClassName}>
									<ChevronLeft
										className="size-4"
										aria-hidden="true"
									/>
									Back
								</span>
							)}
							{nextPost ? (
								<Link
									href={`/blog/${nextPost.slug}`}
									className={lightButtonClassName}
									aria-label={`Next article: ${nextPost.title}`}
								>
									Next
									<ChevronRight
										className="size-4"
										aria-hidden="true"
									/>
								</Link>
							) : (
								<span className={lightButtonDisabledClassName}>
									Next
									<ChevronRight
										className="size-4"
										aria-hidden="true"
									/>
								</span>
							)}
						</div>
					</nav>
					<h1
						data-tina-field={tinaField(post, 'title')}
						className="font-heading text-4xl font-normal text-[#333333] sm:text-5xl"
					>
						{post.title}
					</h1>
					{metaBits.length > 0 ? (
						<p className="mt-3 text-sm text-[#888888]">
							{post.author ? (
								<span data-tina-field={tinaField(post, 'author')}>
									{post.author}
								</span>
							) : null}
							{post.author && post.publishedAt ? (
								<span aria-hidden="true"> · </span>
							) : null}
							{post.publishedAt ? (
								<time
									dateTime={post.publishedAt}
									data-tina-field={tinaField(post, 'publishedAt')}
								>
									{formatPublishedAt(post.publishedAt)}
								</time>
							) : null}
						</p>
					) : null}
					{post.shortDescription ? (
						<p
							data-tina-field={tinaField(post, 'shortDescription')}
							className="mt-6 font-sans text-lg leading-relaxed text-[#555555]"
						>
							{post.shortDescription}
						</p>
					) : null}
				</div>
			</header>

			{post.blocks?.map((block, i) => {
				switch (block?.__typename) {
					case 'BlogBlocksRichText':
						return (
							<BlogRichText
								key={i}
								{...block}
							/>
						);
					case 'BlogBlocksImage':
						return (
							<BlogImage
								key={i}
								{...block}
							/>
						);
					case 'BlogBlocksImageGallery':
						return (
							<BlogImageGallery
								key={i}
								{...block}
							/>
						);
					case 'BlogBlocksPullQuote':
						return (
							<BlogPullQuote
								key={i}
								{...block}
							/>
						);
					case 'BlogBlocksEmbed':
						return (
							<BlogEmbed
								key={i}
								{...block}
							/>
						);
					case 'BlogBlocksDivider':
						return (
							<BlogDivider
								key={i}
								{...block}
							/>
						);
					case 'BlogBlocksCta':
						return (
							<BlogCta
								key={i}
								{...block}
							/>
						);
					case 'BlogBlocksMap':
						return (
							<BlogMap
								key={i}
								{...block}
								postId={block.postId || post.postId}
							/>
						);
					default:
						return null;
				}
			})}
		</article>
	);
}
