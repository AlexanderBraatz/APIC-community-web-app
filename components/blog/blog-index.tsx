'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type BlogIndexItem = {
	slug: string;
	title: string;
	shortDescription?: string | null;
	author?: string | null;
	publishedAt?: string | null;
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

export default function BlogIndex({ posts }: { posts: BlogIndexItem[] }) {
	const [query, setQuery] = useState('');

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return posts;
		return posts.filter(post => {
			const title = post.title?.toLowerCase() ?? '';
			const description = post.shortDescription?.toLowerCase() ?? '';
			return title.includes(q) || description.includes(q);
		});
	}, [posts, query]);

	return (
		<main className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-3xl">
				<h1 className="font-heading text-4xl font-normal text-[#333333] sm:text-5xl">
					Blog
				</h1>

				<label className="mt-8 block">
					<span className="sr-only">Search posts</span>
					<input
						type="search"
						value={query}
						onChange={e => setQuery(e.target.value)}
						placeholder="Search by title or short description"
						className="w-full border border-[#d9cfc2] bg-white px-4 py-3 font-sans text-base text-[#333333] outline-none placeholder:text-[#999999] focus:border-[#805b32]"
					/>
				</label>

				{filtered.length === 0 ? (
					<p className="mt-12 font-sans text-lg text-[#666666]">
						No posts match your search.
					</p>
				) : (
					<ul className="mt-12 divide-y divide-[#e8e0d6]">
						{filtered.map(post => {
							const meta = [
								post.author,
								formatPublishedAt(post.publishedAt)
							].filter(Boolean);

							return (
								<li
									key={post.slug}
									className="py-8 first:pt-0"
								>
									<Link
										href={`/blog/${post.slug}`}
										className="group block"
									>
										<h2 className="font-heading text-2xl font-normal text-[#333333] transition-colors group-hover:text-[#5D4325] sm:text-3xl">
											{post.title}
										</h2>
										{meta.length > 0 ? (
											<p className="mt-2 text-sm text-[#888888]">
												{meta.join(' · ')}
											</p>
										) : null}
										{post.shortDescription ? (
											<p className="mt-3 font-sans text-base leading-relaxed text-[#555555]">
												{post.shortDescription}
											</p>
										) : null}
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
