import type { createClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

const SLUG_MAX = 200;

/**
 * URL-safe slug from a title. Empty input → `"post"`.
 * Truncated to the DB length constraint.
 */
export function slugify(title: string): string {
	const base = title
		.toLowerCase()
		.trim()
		.replace(/['']/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');

	const clipped = (base || 'post').slice(0, SLUG_MAX).replace(/-+$/g, '');
	return clipped || 'post';
}

function shortIdSuffix(): string {
	return Math.random().toString(36).slice(2, 8);
}

/**
 * Ensure `candidate` is unique on `blog_posts.slug`.
 * On collision, appends `-{shortId}` (retries a few times).
 * Pass `excludePostId` when updating an existing post so its own slug is allowed.
 */
export async function ensureUniqueSlug(
	supabase: Supabase,
	candidate: string,
	excludePostId?: string
): Promise<string> {
	let slug = candidate.slice(0, SLUG_MAX) || 'post';

	for (let attempt = 0; attempt < 8; attempt++) {
		let query = supabase
			.from('blog_posts')
			.select('id')
			.eq('slug', slug)
			.limit(1);

		if (excludePostId) {
			query = query.neq('id', excludePostId);
		}

		const { data, error } = await query.maybeSingle();
		if (error) {
			throw new Error(error.message);
		}
		if (!data) {
			return slug;
		}

		const suffix = `-${shortIdSuffix()}`;
		const base = candidate.slice(0, Math.max(1, SLUG_MAX - suffix.length));
		slug = `${base}${suffix}`;
	}

	throw new Error('Could not allocate a unique slug.');
}

/**
 * When a post's slug changes:
 * 1. Drop any redirect whose `old_slug` equals the new current slug
 *    (that slug is live again; redirect would be stale/confusing).
 * 2. Upsert `old_slug` → this `postId`.
 *    If `old_slug` already redirected elsewhere, reassign it to this post —
 *    this post is the one that just abandoned that slug.
 *
 * Storage paths use post UUID only; callers must not move files on slug change.
 */
export async function recordSlugRedirect(
	supabase: Supabase,
	opts: { postId: string; oldSlug: string; newSlug: string }
): Promise<void> {
	const { postId, oldSlug, newSlug } = opts;
	if (!oldSlug || !newSlug || oldSlug === newSlug) return;

	const { error: clearError } = await supabase
		.from('blog_slug_redirects')
		.delete()
		.eq('old_slug', newSlug);
	if (clearError) {
		throw new Error(clearError.message);
	}

	const { error: upsertError } = await supabase
		.from('blog_slug_redirects')
		.upsert(
			{ old_slug: oldSlug, post_id: postId },
			{ onConflict: 'old_slug' }
		);
	if (upsertError) {
		throw new Error(upsertError.message);
	}
}
