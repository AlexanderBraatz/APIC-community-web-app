export const BLOG_IMAGES_BUCKET = 'blog-images';

/**
 * Resolve a public URL for a storage path in the `blog-images` bucket
 * (thumbnail or body image). Returns null when path is missing or
 * `NEXT_PUBLIC_SUPABASE_URL` is unset.
 */
export function getBlogThumbnailUrl(
	thumbnailPath: string | null | undefined
): string | null {
	const path = thumbnailPath?.trim();
	if (!path) return null;

	const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
	if (!base) return null;

	const normalized = path.replace(/^\/+/, '');
	return `${base}/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/${normalized}`;
}

/** Fallback when a post has no thumbnail. */
export const BLOG_THUMBNAIL_PLACEHOLDER = '/images/apic-event.webp';
