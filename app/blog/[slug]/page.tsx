import BlogPost from '@/components/blog/blog-post';
import client from '@/tina/__generated__/client';
import { notFound } from 'next/navigation';

function sortByPublishedDesc<
	T extends { publishedAt?: string | null; slug: string }
>(posts: T[]) {
	return [...posts].sort((a, b) => {
		const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
		const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
		return bTime - aTime;
	});
}

export async function generateStaticParams() {
	const result = await client.queries.blogConnection();
	return (result.data.blogConnection.edges ?? [])
		.map(edge => edge?.node?._sys.filename)
		.filter((slug): slug is string => Boolean(slug))
		.map(slug => ({ slug }));
}

export default async function BlogPostPage({
	params
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	try {
		const [result, postsResult] = await Promise.all([
			client.queries.blog({
				relativePath: `${slug}.md`
			}),
			client.queries.blogConnection()
		]);

		const posts = sortByPublishedDesc(
			(postsResult.data.blogConnection.edges ?? [])
				.map(edge => edge?.node)
				.filter((node): node is NonNullable<typeof node> => Boolean(node))
				.map(node => ({
					slug: node._sys.filename,
					title: node.title,
					publishedAt: node.publishedAt
				}))
		);

		const index = posts.findIndex(post => post.slug === slug);
		const newer = index > 0 ? posts[index - 1] : null;
		const older = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;

		return (
			<BlogPost
				{...result}
				previousPost={newer}
				nextPost={older}
			/>
		);
	} catch {
		notFound();
	}
}
