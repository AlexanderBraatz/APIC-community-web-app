'use client';

import { ArrowRight, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import BlogDraftBadge from '@/components/blog/blog-draft-badge';
import BlogPostAdminActions from '@/components/blog/blog-post-admin-actions';
import { buttonVariants } from '@/components/ui/button';
import {
	BLOG_THUMBNAIL_PLACEHOLDER,
	getBlogThumbnailUrl
} from '@/lib/blog/thumbnail';
import type { BlogPost } from '@/lib/blog/types';
import { cn } from '@/lib/utils';

export type BlogIndexCopy = {
	title: string;
	description?: string | null;
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

export default function BlogIndex({
	posts,
	copy,
	isAdmin = false
}: {
	posts: BlogPost[];
	copy: BlogIndexCopy;
	isAdmin?: boolean;
}) {
	const [query, setQuery] = useState('');

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return posts;
		return posts.filter(post => {
			const title = post.title?.toLowerCase() ?? '';
			const description = post.short_description?.toLowerCase() ?? '';
			return title.includes(q) || description.includes(q);
		});
	}, [posts, query]);

	return (
		<main className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-3xl">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<h1 className="font-heading whitespace-pre-line text-4xl font-normal leading-[120%] text-[#333333] sm:text-5xl">
							{copy.title}
						</h1>
						{copy.description ? (
							<p className="mt-5 max-w-2xl font-sans text-base leading-relaxed text-[#555555] sm:text-lg">
								{copy.description}
							</p>
						) : null}
					</div>
					{isAdmin ? (
						<Link
							href="/members/admin/blog/new"
							className={cn(
								buttonVariants({ variant: 'default', size: 'default' }),
								'shrink-0 gap-2 self-start'
							)}
						>
							<Plus className="size-4" aria-hidden />
							Add article
						</Link>
					) : null}
				</div>

				<label className="relative mt-8 block">
					<span className="sr-only">Search posts</span>
					<Search
						className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#7A5A32]"
						aria-hidden="true"
					/>
					<input
						type="search"
						value={query}
						onChange={e => setQuery(e.target.value)}
						placeholder="Search by title or short description"
						className="w-full border border-[#d9cfc2] bg-white py-3 pr-4 pl-12 font-sans text-base text-[#333333] outline-none placeholder:text-[#999999] focus:border-[#805b32]"
					/>
				</label>

				{posts.length === 0 ? (
					<p className="mt-12 font-sans text-lg text-[#666666]">
						{isAdmin
							? 'No articles yet. Use Add article to create the first one.'
							: 'No articles yet. Check back soon.'}
					</p>
				) : filtered.length === 0 ? (
					<p className="mt-12 font-sans text-lg text-[#666666]">
						No posts match your search.
					</p>
				) : (
					<ul className="mt-12 divide-y divide-[#e8e0d6]">
						{filtered.map(post => {
							const meta = [
								post.author,
								formatPublishedAt(post.published_at)
							].filter(Boolean);
							const imageSrc =
								getBlogThumbnailUrl(post.thumbnail_path) ??
								BLOG_THUMBNAIL_PLACEHOLDER;

							return (
								<li
									key={post.id}
									className="py-8 first:pt-0"
								>
									{isAdmin ? (
										<div className="mb-4">
											<BlogPostAdminActions
												postId={post.id}
												title={post.title}
												status={post.status}
												compact
												includeStatusActions={false}
											/>
										</div>
									) : null}
									<Link
										href={`/blog/${post.slug}`}
										className="group block"
									>
										<div className="flex min-w-0 flex-wrap items-center gap-2.5">
											<h2 className="min-w-0 break-words font-heading text-2xl font-normal text-[#333333] transition-colors group-hover:text-[#5D4325] sm:text-3xl">
												{post.title}
											</h2>
											{isAdmin && post.status === 'draft' ? (
												<BlogDraftBadge />
											) : null}
										</div>
										{meta.length > 0 ? (
											<p className="mt-2 text-sm text-[#888888]">
												{meta.join(' · ')}
											</p>
										) : null}
										{post.short_description ? (
											<p className="mt-3 break-words font-sans text-base leading-relaxed text-[#555555]">
												{post.short_description}
											</p>
										) : null}
										<Image
											src={imageSrc}
											alt=""
											className="mt-5 w-full object-cover"
											width={768}
											height={576}
											sizes="(min-width: 860px) 769px, 92.78vw"
										/>
										<span className="mt-5 flex justify-end">
											<span
												className={cn(
													buttonVariants({ variant: 'default' }),
													'gap-2 group-hover:border-[#0a0f0b] group-hover:bg-[#1f2d22]'
												)}
											>
												Read article
												<ArrowRight
													className="size-4"
													aria-hidden="true"
												/>
											</span>
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</main>
	);
}
