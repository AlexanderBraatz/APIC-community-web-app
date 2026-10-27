'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
	BLOG_IMAGES_BUCKET,
	getBlogThumbnailUrl
} from '@/lib/blog/thumbnail';
import {
	ensureUniqueSlug,
	recordSlugRedirect,
	slugify
} from '@/lib/blog/slug';
import type { BlogPost, BlogPostStatus } from '@/lib/blog/types';
import type { Json } from '@/lib/supabase/database.types';

export type BlogActionOk<T extends Record<string, unknown> = Record<string, never>> =
	{ ok: true } & T;
export type BlogActionErr = { ok: false; error: string };
export type BlogActionResult<T extends Record<string, unknown> = Record<string, never>> =
	| BlogActionOk<T>
	| BlogActionErr;

export type CreateDraftInput = {
	title: string;
	author: string;
	publishedAt: string;
	shortDescription: string;
	thumbnailPath?: string | null;
};

export type UpdateDraftInput = {
	title?: string;
	author?: string;
	publishedAt?: string;
	shortDescription?: string;
	thumbnailPath?: string | null;
	body?: Json;
};

const ALLOWED_IMAGE_MIME = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif'
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MiB (bucket limit)

const POST_SELECT =
	'id, slug, title, author, published_at, short_description, thumbnail_path, body, status' as const;

type PostRow = {
	id: string;
	slug: string;
	title: string;
	author: string;
	published_at: string;
	short_description: string;
	thumbnail_path: string | null;
	body: Json;
	status: string;
};

function mapPost(row: PostRow): BlogPost {
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

function fail(error: unknown, fallback: string): BlogActionErr {
	return {
		ok: false,
		error: error instanceof Error ? error.message : fallback
	};
}

function trimRequired(
	value: unknown,
	label: string,
	max: number
): string | BlogActionErr {
	if (typeof value !== 'string') {
		return { ok: false, error: `${label} is required.` };
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return { ok: false, error: `${label} is required.` };
	}
	if (trimmed.length > max) {
		return { ok: false, error: `${label} must be at most ${max} characters.` };
	}
	return trimmed;
}

function parsePublishedAt(value: unknown): string | BlogActionErr {
	if (typeof value !== 'string' || !value.trim()) {
		return { ok: false, error: 'Published date is required.' };
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return { ok: false, error: 'Published date is invalid.' };
	}
	return date.toISOString();
}

function validateHeaderFields(input: {
	title: unknown;
	author: unknown;
	publishedAt: unknown;
	shortDescription: unknown;
	thumbnailPath?: unknown;
}):
	| {
			title: string;
			author: string;
			publishedAt: string;
			shortDescription: string;
			thumbnailPath: string | null;
	  }
	| BlogActionErr {
	const title = trimRequired(input.title, 'Title', 300);
	if (typeof title !== 'string') return title;

	const author = trimRequired(input.author, 'Author', 200);
	if (typeof author !== 'string') return author;

	const publishedAt = parsePublishedAt(input.publishedAt);
	if (typeof publishedAt !== 'string') return publishedAt;

	const shortDescription = trimRequired(
		input.shortDescription,
		'Short description',
		2000
	);
	if (typeof shortDescription !== 'string') return shortDescription;

	let thumbnailPath: string | null = null;
	if (input.thumbnailPath !== undefined && input.thumbnailPath !== null) {
		if (typeof input.thumbnailPath !== 'string') {
			return { ok: false, error: 'Thumbnail path is invalid.' };
		}
		const trimmed = input.thumbnailPath.trim();
		if (trimmed.length > 1000) {
			return { ok: false, error: 'Thumbnail path is too long.' };
		}
		thumbnailPath = trimmed || null;
	}

	return { title, author, publishedAt, shortDescription, thumbnailPath };
}

function isSlugUniqueViolation(message: string): boolean {
	return /blog_posts_slug_unique|duplicate key.*slug/i.test(message);
}

function revalidateBlogPaths(...slugs: Array<string | null | undefined>) {
	revalidatePath('/blog');
	const seen = new Set<string>();
	for (const slug of slugs) {
		const s = slug?.trim();
		if (!s || seen.has(s)) continue;
		seen.add(s);
		revalidatePath(`/blog/${s}`);
	}
}

async function loadVisiblePost(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	id: string
): Promise<PostRow | null> {
	const { data, error } = await supabase
		.from('blog_posts')
		.select(POST_SELECT)
		.eq('id', id)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}
	// Soft-deleted rows are invisible under RLS → null (treat as not found).
	return data;
}

function sanitizeUploadFilename(name: string): string {
	const base = name.split(/[/\\]/).pop()?.trim() || 'image';
	const cleaned = base
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
	const withExt = cleaned.includes('.') ? cleaned : `${cleaned || 'image'}.bin`;
	return withExt.slice(0, 180);
}

/**
 * Create a draft from valid header fields. Body starts as `{}`.
 * Slug is derived from title (unique). Storage paths use the new post UUID.
 */
export async function createDraft(
	input: CreateDraftInput
): Promise<BlogActionResult<{ id: string; slug: string; post: BlogPost }>> {
	try {
		const { supabase, user } = await requireAdmin();
		const parsed = validateHeaderFields(input);
		if ('ok' in parsed) return parsed;

		const { title, author, publishedAt, shortDescription, thumbnailPath } =
			parsed;

		let slug = await ensureUniqueSlug(supabase, slugify(title));
		let lastError: string | null = null;

		for (let attempt = 0; attempt < 5; attempt++) {
			const { data, error } = await supabase
				.from('blog_posts')
				.insert({
					title,
					author,
					published_at: publishedAt,
					short_description: shortDescription,
					thumbnail_path: thumbnailPath,
					slug,
					body: {} as Json,
					status: 'draft',
					created_by: user.id,
					updated_by: user.id
				})
				.select(POST_SELECT)
				.single();

			if (!error && data) {
				revalidateBlogPaths(data.slug);
				return {
					ok: true,
					id: data.id,
					slug: data.slug,
					post: mapPost(data)
				};
			}

			lastError = error?.message ?? 'Create failed.';
			if (!error || !isSlugUniqueViolation(error.message)) {
				return { ok: false, error: lastError };
			}
			// Soft-deleted rows can occupy slugs but are invisible to SELECT — retry.
			slug = await ensureUniqueSlug(
				supabase,
				`${slugify(title)}-${Math.random().toString(36).slice(2, 8)}`
			);
		}

		return { ok: false, error: lastError ?? 'Create failed.' };
	} catch (error) {
		return fail(error, 'Create failed.');
	}
}

/**
 * Autosave / partial update. Re-slugifies when title changes and writes
 * `blog_slug_redirects` for the old slug. Never updates soft-deleted posts.
 * Does not change status (use publish / turnBackToDraft / softDelete).
 */
export async function updateDraft(
	id: string,
	partial: UpdateDraftInput
): Promise<BlogActionResult<{ post: BlogPost }>> {
	try {
		const { supabase, user } = await requireAdmin();
		const postId = id?.trim();
		if (!postId) return { ok: false, error: 'Post id is required.' };

		const existing = await loadVisiblePost(supabase, postId);
		if (!existing) {
			return { ok: false, error: 'Post not found or deleted.' };
		}

		const patch: {
			title?: string;
			author?: string;
			published_at?: string;
			short_description?: string;
			thumbnail_path?: string | null;
			body?: Json;
			slug?: string;
			updated_by: string;
		} = { updated_by: user.id };

		if (partial.title !== undefined) {
			const title = trimRequired(partial.title, 'Title', 300);
			if (typeof title !== 'string') return title;
			patch.title = title;
		}
		if (partial.author !== undefined) {
			const author = trimRequired(partial.author, 'Author', 200);
			if (typeof author !== 'string') return author;
			patch.author = author;
		}
		if (partial.publishedAt !== undefined) {
			const publishedAt = parsePublishedAt(partial.publishedAt);
			if (typeof publishedAt !== 'string') return publishedAt;
			patch.published_at = publishedAt;
		}
		if (partial.shortDescription !== undefined) {
			const shortDescription = trimRequired(
				partial.shortDescription,
				'Short description',
				2000
			);
			if (typeof shortDescription !== 'string') return shortDescription;
			patch.short_description = shortDescription;
		}
		if (partial.thumbnailPath !== undefined) {
			if (partial.thumbnailPath === null) {
				patch.thumbnail_path = null;
			} else if (typeof partial.thumbnailPath === 'string') {
				const trimmed = partial.thumbnailPath.trim();
				if (trimmed.length > 1000) {
					return { ok: false, error: 'Thumbnail path is too long.' };
				}
				patch.thumbnail_path = trimmed || null;
			} else {
				return { ok: false, error: 'Thumbnail path is invalid.' };
			}
		}
		if (partial.body !== undefined) {
			patch.body = partial.body;
		}

		const titleForSlug = patch.title ?? existing.title;

		let oldSlug: string | null = null;
		if (partial.title !== undefined) {
			let nextSlug = await ensureUniqueSlug(
				supabase,
				slugify(titleForSlug),
				postId
			);

			for (let attempt = 0; attempt < 5; attempt++) {
				if (nextSlug !== existing.slug) {
					oldSlug = existing.slug;
					patch.slug = nextSlug;
				} else {
					oldSlug = null;
					delete patch.slug;
				}

				const { data, error } = await supabase
					.from('blog_posts')
					.update(patch)
					.eq('id', postId)
					.select(POST_SELECT)
					.single();

				if (!error && data) {
					if (oldSlug && data.slug !== oldSlug) {
						await recordSlugRedirect(supabase, {
							postId,
							oldSlug,
							newSlug: data.slug
						});
					}
					revalidateBlogPaths(oldSlug, data.slug, existing.slug);
					return { ok: true, post: mapPost(data) };
				}

				if (!error || !isSlugUniqueViolation(error.message)) {
					return {
						ok: false,
						error: error?.message ?? 'Update failed.'
					};
				}

				nextSlug = await ensureUniqueSlug(
					supabase,
					`${slugify(titleForSlug)}-${Math.random().toString(36).slice(2, 8)}`,
					postId
				);
			}

			return { ok: false, error: 'Update failed (slug conflict).' };
		}

		const { data, error } = await supabase
			.from('blog_posts')
			.update(patch)
			.eq('id', postId)
			.select(POST_SELECT)
			.single();

		if (error || !data) {
			return { ok: false, error: error?.message ?? 'Update failed.' };
		}

		revalidateBlogPaths(data.slug);
		return { ok: true, post: mapPost(data) };
	} catch (error) {
		return fail(error, 'Update failed.');
	}
}

export async function publish(
	id: string
): Promise<BlogActionResult<{ post: BlogPost }>> {
	try {
		const { supabase, user } = await requireAdmin();
		const postId = id?.trim();
		if (!postId) return { ok: false, error: 'Post id is required.' };

		const existing = await loadVisiblePost(supabase, postId);
		if (!existing) {
			return { ok: false, error: 'Post not found or deleted.' };
		}

		const { data, error } = await supabase
			.from('blog_posts')
			.update({ status: 'published', updated_by: user.id })
			.eq('id', postId)
			.select(POST_SELECT)
			.single();

		if (error || !data) {
			return { ok: false, error: error?.message ?? 'Publish failed.' };
		}

		revalidateBlogPaths(data.slug);
		return { ok: true, post: mapPost(data) };
	} catch (error) {
		return fail(error, 'Publish failed.');
	}
}

export async function turnBackToDraft(
	id: string
): Promise<BlogActionResult<{ post: BlogPost }>> {
	try {
		const { supabase, user } = await requireAdmin();
		const postId = id?.trim();
		if (!postId) return { ok: false, error: 'Post id is required.' };

		const existing = await loadVisiblePost(supabase, postId);
		if (!existing) {
			return { ok: false, error: 'Post not found or deleted.' };
		}

		const { data, error } = await supabase
			.from('blog_posts')
			.update({ status: 'draft', updated_by: user.id })
			.eq('id', postId)
			.select(POST_SELECT)
			.single();

		if (error || !data) {
			return {
				ok: false,
				error: error?.message ?? 'Turn back to draft failed.'
			};
		}

		revalidateBlogPaths(data.slug);
		return { ok: true, post: mapPost(data) };
	} catch (error) {
		return fail(error, 'Turn back to draft failed.');
	}
}

export async function softDelete(
	id: string
): Promise<BlogActionResult<{ id: string }>> {
	try {
		const { supabase, user } = await requireAdmin();
		const postId = id?.trim();
		if (!postId) return { ok: false, error: 'Post id is required.' };

		const existing = await loadVisiblePost(supabase, postId);
		if (!existing) {
			return { ok: false, error: 'Post not found or deleted.' };
		}

		const { error } = await supabase
			.from('blog_posts')
			.update({
				status: 'deleted',
				deleted_at: new Date().toISOString(),
				updated_by: user.id
			})
			.eq('id', postId);

		if (error) {
			return { ok: false, error: error.message };
		}

		revalidateBlogPaths(existing.slug);
		return { ok: true, id: postId };
	} catch (error) {
		return fail(error, 'Soft delete failed.');
	}
}

/**
 * Upload an image into `blog-images` at `{postId}/thumbnail|body/{filename}`.
 * Prefer FormData from the client: `postId`, `kind` (`thumbnail`|`body`), `file`.
 * Does not update `thumbnail_path` — caller should pass the returned `path` to
 * `updateDraft` when setting a featured image.
 */
export async function uploadBlogImage(
	formData: FormData
): Promise<
	BlogActionResult<{ path: string; publicUrl: string }>
> {
	try {
		const { supabase } = await requireAdmin();

		const postId = String(formData.get('postId') ?? '').trim();
		const kindRaw = String(formData.get('kind') ?? '').trim();
		const file = formData.get('file');

		if (!postId) return { ok: false, error: 'Post id is required.' };
		if (kindRaw !== 'thumbnail' && kindRaw !== 'body') {
			return { ok: false, error: 'kind must be “thumbnail” or “body”.' };
		}
		if (!(file instanceof File)) {
			return { ok: false, error: 'File is required.' };
		}
		if (!ALLOWED_IMAGE_MIME.has(file.type)) {
			return {
				ok: false,
				error: 'Image must be JPEG, PNG, WebP, or GIF.'
			};
		}
		if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
			return {
				ok: false,
				error: 'Image must be between 1 byte and 10 MiB.'
			};
		}

		const existing = await loadVisiblePost(supabase, postId);
		if (!existing) {
			return { ok: false, error: 'Post not found or deleted.' };
		}

		const filename = sanitizeUploadFilename(file.name || 'image.jpg');
		const path = `${postId}/${kindRaw}/${filename}`;

		const buffer = Buffer.from(await file.arrayBuffer());
		const { error: uploadError } = await supabase.storage
			.from(BLOG_IMAGES_BUCKET)
			.upload(path, buffer, {
				contentType: file.type,
				upsert: true
			});

		if (uploadError) {
			return { ok: false, error: uploadError.message };
		}

		const publicUrl = getBlogThumbnailUrl(path);
		if (!publicUrl) {
			return {
				ok: false,
				error: 'Upload succeeded but public URL could not be built.'
			};
		}

		return { ok: true, path, publicUrl };
	} catch (error) {
		return fail(error, 'Upload failed.');
	}
}
