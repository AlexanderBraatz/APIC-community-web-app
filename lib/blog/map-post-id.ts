/** Supabase `blog_posts.id` / `blog_map_locations.post_id` (uuid). */
const UUID_POST_ID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBlogMapPostId(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	return UUID_POST_ID.test(value.trim());
}
