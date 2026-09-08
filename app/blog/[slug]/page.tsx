import BlogPost from '@/components/blog/blog-post';
import client from '@/tina/__generated__/client';
import { notFound } from 'next/navigation';

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
		const result = await client.queries.blog({
			relativePath: `${slug}.md`
		});
		return <BlogPost {...result} />;
	} catch {
		notFound();
	}
}
