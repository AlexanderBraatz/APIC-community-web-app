'use client';

import BlogBody from '@/components/blog/blog-body';
import BlogMap from '@/components/blog/blocks/map';
import {
	AnalyticsEvents,
	useAnalytics
} from '@/components/analytics/posthog-provider';
import { buttonVariants } from '@/components/ui/button';
import {
	BLOG_THUMBNAIL_PLACEHOLDER,
	getBlogThumbnailUrl
} from '@/lib/blog/thumbnail';
import type { BlogNeighbor, BlogPost as BlogPostData } from '@/lib/blog/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

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
	post,
	previousPost,
	nextPost,
	isAdmin = false
}: {
	post: BlogPostData;
	previousPost?: BlogNeighbor | null;
	nextPost?: BlogNeighbor | null;
	isAdmin?: boolean;
}) {
	const { track } = useAnalytics();
	const thumbnailSrc =
		getBlogThumbnailUrl(post.thumbnail_path) ?? BLOG_THUMBNAIL_PLACEHOLDER;
	const metaBits = [post.author, formatPublishedAt(post.published_at)].filter(
		Boolean
	);

	useEffect(() => {
		if (post.slug) {
			track(AnalyticsEvents.EVENT_OPENED, { content_id: post.slug });
		}
	}, [post.slug, track]);

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
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="font-heading text-4xl font-normal text-[#333333] sm:text-5xl">
							{post.title}
						</h1>
						{isAdmin && post.status === 'draft' ? (
							<span className="rounded border border-[#c4a574] bg-[#f7f0e4] px-2 py-0.5 font-sans text-xs font-medium uppercase tracking-wide text-[#7A5A32]">
								Draft
							</span>
						) : null}
					</div>
					{metaBits.length > 0 ? (
						<p className="mt-3 text-sm text-[#888888]">
							{post.author ? <span>{post.author}</span> : null}
							{post.author && post.published_at ? (
								<span aria-hidden="true"> · </span>
							) : null}
							{post.published_at ? (
								<time dateTime={post.published_at}>
									{formatPublishedAt(post.published_at)}
								</time>
							) : null}
						</p>
					) : null}
					{post.short_description ? (
						<p className="mt-6 whitespace-pre-line font-sans text-lg leading-relaxed text-[#555555]">
							{post.short_description}
						</p>
					) : null}
					<Image
						src={thumbnailSrc}
						alt=""
						className="mt-8 w-full object-cover"
						width={768}
						height={576}
						sizes="(min-width: 860px) 769px, 92.78vw"
						priority
					/>
				</div>
			</header>

			{/* Map keyed by stable post uuid (Tina numeric ids until Stage 7 migration). */}
			<BlogMap postId={post.id} />

			<BlogBody body={post.body} />
		</article>
	);
}
