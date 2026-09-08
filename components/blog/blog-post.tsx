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
import { tinaField } from 'tinacms/tina-field';
import { useTina } from 'tinacms/react';

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

export default function BlogPost(props: {
	data: BlogQuery;
	variables: { relativePath: string };
	query: string;
}) {
	const { data } = useTina(props);
	const post = data.blog;
	const metaBits = [post.author, formatPublishedAt(post.publishedAt)].filter(
		Boolean
	);

	return (
		<article>
			<header className="bg-white px-4 pb-6 pt-14 sm:px-6 lg:px-8 lg:pt-20">
				<div className="mx-auto max-w-3xl">
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
