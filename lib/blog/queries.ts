import { isAdmin } from '@/lib/admin/is-admin';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';
import type {
	BlogPost,
	BlogPostStatus,
	GetPostBySlugResult
} from '@/lib/blog/types';

const LIST_SELECT =
	'id, slug, title, author, published_at, short_description, thumbnail_path, body, status' as const;

function mapPost(row: {
	id: string;
	slug: string;
	title: string;
	author: string;
	published_at: string;
	short_description: string;
	thumbnail_path: string | null;
	body: Json;
	status: string;
}): BlogPost {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		author: row.author,
		published_at: row.published_at,
		short_description: row.short_description,
		thumbnail_path: row.thumbnail_path,
		body: row.body,
		status: row.status as BlogPostStatus
	};
}

function visibleStatuses(admin: boolean): BlogPostStatus[] {
	return admin ? ['published', 'draft'] : ['published'];
}

/**
 * List blog posts visible to the current caller.
 * Visitors: published only. Admins: published + draft. Never deleted.
 * Sorted by published_at descending.
 */
export async function listBlogPosts(): Promise<{
	posts: BlogPost[];
	isAdmin: boolean;
}> {
	const supabase = await createClient();
	const admin = await isAdmin(supabase);

	const { data, error } = await supabase
		.from('blog_posts')
		.select(LIST_SELECT)
		.in('status', visibleStatuses(admin))
		.order('published_at', { ascending: false });

	if (error) {
		throw new Error(error.message);
	}

	return {
		posts: (data ?? []).map(mapPost),
		isAdmin: admin
	};
}

/**
 * Fetch a post by slug with the same visibility rules as the index.
 * If no post matches, looks up `blog_slug_redirects` and returns the
 * current slug of the target post when that post is still visible.
 */
export async function getBlogPostBySlug(
	slug: string
): Promise<GetPostBySlugResult & { isAdmin: boolean }> {
	const supabase = await createClient();
	const admin = await isAdmin(supabase);
	const statuses = visibleStatuses(admin);

	const { data: post, error: postError } = await supabase
		.from('blog_posts')
		.select(LIST_SELECT)
		.eq('slug', slug)
		.in('status', statuses)
		.maybeSingle();

	if (postError) {
		throw new Error(postError.message);
	}

	if (post) {
		return { kind: 'post', post: mapPost(post), isAdmin: admin };
	}

	const { data: redirect, error: redirectError } = await supabase
		.from('blog_slug_redirects')
		.select('post_id')
		.eq('old_slug', slug)
		.maybeSingle();

	if (redirectError) {
		throw new Error(redirectError.message);
	}

	if (!redirect) {
		return { kind: 'not_found', isAdmin: admin };
	}

	const { data: target, error: targetError } = await supabase
		.from('blog_posts')
		.select('slug, status')
		.eq('id', redirect.post_id)
		.in('status', statuses)
		.maybeSingle();

	if (targetError) {
		throw new Error(targetError.message);
	}

	if (!target) {
		return { kind: 'not_found', isAdmin: admin };
	}

	return { kind: 'redirect', slug: target.slug, isAdmin: admin };
}
