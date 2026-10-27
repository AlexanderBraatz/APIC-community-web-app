import BlogIndex from '@/components/blog/blog-index';
import { listBlogPosts } from '@/lib/blog/queries';

/** Public blog index copy (Tina blogIndex collection removed in Stage 7). */
const BLOG_INDEX_COPY = {
	title: 'News, Events & Activities',
	description:
		'News about upcoming gatherings, plus stories from past events, activities, and community life at Castelfalfi.'
};

export default async function BlogPage() {
	const { posts, isAdmin } = await listBlogPosts();

	return (
		<BlogIndex
			posts={posts}
			copy={BLOG_INDEX_COPY}
			isAdmin={isAdmin}
		/>
	);
}
