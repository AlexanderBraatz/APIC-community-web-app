import BlogPost from '@/components/blog/blog-post';
import { getBlogPostBySlug, listBlogPosts } from '@/lib/blog/queries';
import { notFound, redirect } from 'next/navigation';

export default async function BlogPostPage({
	params
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const result = await getBlogPostBySlug(slug);

	if (result.kind === 'not_found') {
		notFound();
	}

	if (result.kind === 'redirect') {
		redirect(`/blog/${result.slug}`);
	}

	const { posts } = await listBlogPosts();
	const index = posts.findIndex(post => post.slug === result.post.slug);
	const previousPost =
		index > 0
			? { slug: posts[index - 1].slug, title: posts[index - 1].title }
			: null;
	const nextPost =
		index >= 0 && index < posts.length - 1
			? { slug: posts[index + 1].slug, title: posts[index + 1].title }
			: null;

	return (
		<BlogPost
			post={result.post}
			previousPost={previousPost}
			nextPost={nextPost}
			isAdmin={result.isAdmin}
		/>
	);
}
