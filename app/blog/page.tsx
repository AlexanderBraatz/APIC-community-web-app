import BlogIndex, { BlogIndexItem } from '@/components/blog/blog-index';
import client from '@/tina/__generated__/client';
import type { BlogConnectionQuery } from '@/tina/__generated__/types';

type BlogNode = NonNullable<
	NonNullable<
		NonNullable<BlogConnectionQuery['blogConnection']['edges']>[number]
	>['node']
>;

function firstPostImage(blocks: BlogNode['blocks']): {
	image?: string | null;
	imageAlt?: string | null;
} {
	for (const block of blocks ?? []) {
		if (!block) continue;

		if (block.__typename === 'BlogBlocksImage' && block.image) {
			return { image: block.image, imageAlt: block.alt };
		}

		if (block.__typename === 'BlogBlocksImageGallery') {
			const first = (block.images ?? []).find(item => item?.image);
			if (first?.image) {
				return { image: first.image, imageAlt: first.alt };
			}
		}
	}

	return {};
}

export default async function BlogPage() {
	const [postsResult, indexResult] = await Promise.all([
		client.queries.blogConnection(),
		client.queries.blogIndex({ relativePath: 'index.json' })
	]);

	const posts: BlogIndexItem[] = (postsResult.data.blogConnection.edges ?? [])
		.map(edge => edge?.node)
		.filter((node): node is NonNullable<typeof node> => Boolean(node))
		.map(node => {
			const { image, imageAlt } = firstPostImage(node.blocks);
			return {
				slug: node._sys.filename,
				title: node.title,
				shortDescription: node.shortDescription,
				author: node.author,
				publishedAt: node.publishedAt,
				image,
				imageAlt
			};
		})
		.sort((a, b) => {
			const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
			const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
			return bTime - aTime;
		});

	return <BlogIndex posts={posts} {...indexResult} />;
}
