export const BLOG_IMAGES_BUCKET = 'blog-images';

/** Session-checked route for objects in the private `blog-images` bucket. */
export const BLOG_IMAGE_ROUTE_PREFIX = '/blog/images/';

/**
 * Address for a storage path in the `blog-images` bucket
 * (thumbnail or body image). Returns null when path is missing.
 */
export function getBlogThumbnailUrl(
	thumbnailPath: string | null | undefined
): string | null {
	const path = thumbnailPath?.trim().replace(/^\/+/, '');
	if (!path) return null;
	return `${BLOG_IMAGE_ROUTE_PREFIX}${path}`;
}

/** True when `src` is served by the session-checked blog image route. */
export function isBlogImageRouteSrc(src: string): boolean {
	return src.startsWith(BLOG_IMAGE_ROUTE_PREFIX);
}

/** Fallback when a post has no thumbnail. */
export const BLOG_THUMBNAIL_PLACEHOLDER = '/images/apic-event.webp';
