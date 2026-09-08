import BlogIndex, { BlogIndexItem } from '@/components/blog/blog-index';
import client from '@/tina/__generated__/client';

export default async function BlogPage() {
	const result = await client.queries.blogConnection();
	const posts: BlogIndexItem[] = (result.data.blogConnection.edges ?? [])
		.map(edge => edge?.node)
		.filter((node): node is NonNullable<typeof node> => Boolean(node))
		.map(node => ({
			slug: node._sys.filename,
			title: node.title,
			shortDescription: node.shortDescription,
			author: node.author,
			publishedAt: node.publishedAt
		}))
		.sort((a, b) => {
			const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
			const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
			return bTime - aTime;
		});

	return <BlogIndex posts={posts} />;
}
