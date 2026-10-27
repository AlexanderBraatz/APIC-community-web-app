'use client';

import BlogBody from '@/components/blog/blog-body';
import BlogDraftBadge from '@/components/blog/blog-draft-badge';
import BlogMap from '@/components/blog/blocks/map';
import BlogMapDisplay from '@/components/blog/blog-map-display';
import BlogPostAdminActions from '@/components/blog/blog-post-admin-actions';
import { buttonVariants } from '@/components/ui/button';
import {
	BLOG_THUMBNAIL_PLACEHOLDER,
	getBlogThumbnailUrl
} from '@/lib/blog/thumbnail';
import type { BlogMapLocation } from '@/lib/blog/map-location-actions';
import type { BlogNeighbor, BlogPost as BlogPostData } from '@/lib/blog/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Json } from '@/lib/supabase/database.types';

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

export type BlogArticleViewPost = {
	id: string;
	slug: string;
	title: string;
	author: string;
	published_at: string;
	short_description: string;
	thumbnail_path: string | null;
	body: Json;
	status: BlogPostData['status'];
};

type BlogArticleViewProps = {
	post: BlogArticleViewPost;
	previousPost?: BlogNeighbor | null;
	nextPost?: BlogNeighbor | null;
	isAdmin?: boolean;
	/** When false, nav links render as disabled placeholders (preview). */
	interactiveNav?: boolean;
	/**
	 * `fetch` — load map by post id (public page).
	 * `static` — render `mapLocation` only (admin preview from form state).
	 * `none` — omit map section.
	 */
	mapMode?: 'fetch' | 'static' | 'none';
	mapLocation?: BlogMapLocation | null;
};

/**
 * Shared article chrome for the public page and admin preview.
 */
export default function BlogArticleView({
	post,
	previousPost = null,
	nextPost = null,
	isAdmin = false,
	interactiveNav = true,
	mapMode = 'fetch',
	mapLocation = null
}: BlogArticleViewProps) {
	const thumbnailSrc =
		getBlogThumbnailUrl(post.thumbnail_path) ?? BLOG_THUMBNAIL_PLACEHOLDER;
	const metaBits = [post.author, formatPublishedAt(post.published_at)].filter(
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
						{interactiveNav ? (
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
						) : (
							<span className={lightButtonDisabledClassName}>
								<ArrowLeft
									className="size-4"
									aria-hidden="true"
								/>
								<span className="sm:hidden">Articles</span>
								<span className="hidden sm:inline">Back To Articles</span>
							</span>
						)}
						<div className="flex items-center gap-2 sm:gap-3">
							{interactiveNav && previousPost ? (
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
							{interactiveNav && nextPost ? (
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
					<div className="flex min-w-0 flex-wrap items-center gap-3">
						<h1 className="min-w-0 break-words font-heading text-4xl font-normal text-[#333333] sm:text-5xl">
							{post.title.trim() || 'Untitled'}
						</h1>
						{isAdmin && post.status === 'draft' ? <BlogDraftBadge /> : null}
					</div>
					{isAdmin && interactiveNav ? (
						<div className="mt-5">
							<BlogPostAdminActions
								postId={post.id}
								title={post.title.trim() || 'Untitled'}
								status={post.status}
							/>
						</div>
					) : null}
					{metaBits.length > 0 ? (
						<p
							className={
								isAdmin && interactiveNav
									? 'mt-5 text-sm text-[#888888]'
									: 'mt-3 text-sm text-[#888888]'
							}
						>
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
						<p className="mt-6 break-words whitespace-pre-line font-sans text-lg leading-relaxed text-[#555555]">
							{post.short_description}
						</p>
					) : null}
					<div className="relative mt-8 aspect-4/3 w-full overflow-hidden bg-[#e8e4dc]">
						<Image
							src={thumbnailSrc}
							alt=""
							fill
							className="object-cover"
							sizes="(min-width: 860px) 769px, 92.78vw"
							priority={interactiveNav}
						/>
					</div>
				</div>
			</header>

			{mapMode === 'fetch' ? (
				<BlogMap postId={post.id} title={post.title} />
			) : null}
			{mapMode === 'static' && mapLocation ? (
				<section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-3xl">
						<BlogMapDisplay
							location={mapLocation}
							title={post.title}
						/>
					</div>
				</section>
			) : null}

			<BlogBody body={post.body} />
		</article>
	);
}
