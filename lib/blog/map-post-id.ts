import { isNumericPostId } from '@/tina/blog-post-id';

/** Tina numeric ids (`1`) or Supabase uuid post ids. Column remains text until Stage 7. */
const UUID_POST_ID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBlogMapPostId(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const trimmed = value.trim();
	return isNumericPostId(trimmed) || UUID_POST_ID.test(trimmed);
}
