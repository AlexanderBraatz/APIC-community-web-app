'use server';

import { createHash, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
	blogPublishBlockersMessage,
	getBlogPublishBlockers
} from '@/lib/blog/body';
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
	thumbnailAssetId?: string | null;
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
	'id, slug, title, author, published_at, short_description, thumbnail_path, thumbnail_asset_id, body, status' as const;

type PostRow = {
	id: string;
	slug: string;
	title: string;
	author: string;
	published_at: string;
	short_description: string;
	thumbnail_path: string | null;
	thumbnail_asset_id: string | null;
	body: Json;
	status: string;
};

type ThumbnailAssetRow = {
	id: string;
	storage_path: string;
	content_sha256: string;
	last_used_at: string;
};

type AdminSupabase = Awaited<ReturnType<typeof requireAdmin>>['supabase'];

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

function sha256Hex(buffer: Buffer): string {
	return createHash('sha256').update(buffer).digest('hex');
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
	supabase: AdminSupabase,
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

async function loadThumbnailAsset(
	supabase: AdminSupabase,
	assetId: string
): Promise<ThumbnailAssetRow | null> {
	const { data, error } = await supabase
		.from('blog_thumbnail_assets')
		.select('id, storage_path, content_sha256, last_used_at')
		.eq('id', assetId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}

async function findThumbnailAssetByHash(
	supabase: AdminSupabase,
	contentSha256: string
): Promise<ThumbnailAssetRow | null> {
	const { data, error } = await supabase
		.from('blog_thumbnail_assets')
		.select('id, storage_path, content_sha256, last_used_at')
		.eq('content_sha256', contentSha256)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}

async function countThumbnailAssetRefs(
	supabase: AdminSupabase,
	assetId: string,
	excludePostId?: string
): Promise<number> {
	let query = supabase
		.from('blog_posts')
		.select('id', { count: 'exact', head: true })
		.eq('thumbnail_asset_id', assetId);
	if (excludePostId) {
		query = query.neq('id', excludePostId);
	}
	const { count, error } = await query;
	if (error) throw new Error(error.message);
	return count ?? 0;
}

/** Delete asset row + storage object when no posts reference it. */
async function maybeGcThumbnailAsset(
	supabase: AdminSupabase,
	assetId: string | null | undefined,
	excludePostId?: string
): Promise<void> {
	const id = assetId?.trim();
	if (!id) return;

	const refs = await countThumbnailAssetRefs(supabase, id, excludePostId);
	if (refs > 0) return;

	const asset = await loadThumbnailAsset(supabase, id);
	if (!asset) return;

	await supabase.storage.from(BLOG_IMAGES_BUCKET).remove([asset.storage_path]);
	await supabase.from('blog_thumbnail_assets').delete().eq('id', id);
}

async function setPostThumbnailAsset(
	supabase: AdminSupabase,
	input: {
		postId: string;
		userId: string;
		asset: ThumbnailAssetRow;
		previousAssetId: string | null;
		slug: string;
	}
): Promise<BlogActionResult<{ path: string; publicUrl: string; assetId: string }>> {
	const now = new Date().toISOString();
	const { error: bumpError } = await supabase
		.from('blog_thumbnail_assets')
		.update({ last_used_at: now })
		.eq('id', input.asset.id);
	if (bumpError) {
		return { ok: false, error: bumpError.message };
	}

	const { error: updateError } = await supabase
		.from('blog_posts')
		.update({
			thumbnail_path: input.asset.storage_path,
			thumbnail_asset_id: input.asset.id,
			updated_by: input.userId
		})
		.eq('id', input.postId);

	if (updateError) {
		return { ok: false, error: updateError.message };
	}

	if (
		input.previousAssetId &&
		input.previousAssetId !== input.asset.id
	) {
		await maybeGcThumbnailAsset(
			supabase,
			input.previousAssetId,
			input.postId
		);
	}

	const publicUrl = getBlogThumbnailUrl(input.asset.storage_path);
	if (!publicUrl) {
		return {
			ok: false,
			error: 'Could not build public URL for featured image.'
		};
	}

	revalidateBlogPaths(input.slug);
	return {
		ok: true,
		path: input.asset.storage_path,
		publicUrl,
		assetId: input.asset.id
	};
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
			thumbnail_asset_id?: string | null;
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
				patch.thumbnail_asset_id = null;
			} else if (typeof partial.thumbnailPath === 'string') {
				const trimmed = partial.thumbnailPath.trim();
				if (trimmed.length > 1000) {
					return { ok: false, error: 'Thumbnail path is too long.' };
				}
				patch.thumbnail_path = trimmed || null;
				if (!trimmed) {
					patch.thumbnail_asset_id = null;
				}
			} else {
				return { ok: false, error: 'Thumbnail path is invalid.' };
			}
		}
		if (partial.thumbnailAssetId !== undefined) {
			if (partial.thumbnailAssetId === null) {
				patch.thumbnail_asset_id = null;
			} else if (typeof partial.thumbnailAssetId === 'string') {
				const trimmed = partial.thumbnailAssetId.trim();
				if (!trimmed) {
					patch.thumbnail_asset_id = null;
				} else {
					patch.thumbnail_asset_id = trimmed;
				}
			} else {
				return { ok: false, error: 'Thumbnail asset id is invalid.' };
			}
		}
		if (partial.body !== undefined) {
			// Ensure plain JSON (TipTap attrs can be null-prototype and get
			// stripped by the server-action serializer if not cloned client-side).
			patch.body = JSON.parse(JSON.stringify(partial.body)) as Json;
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

		const blockers = getBlogPublishBlockers({
			thumbnailPath: existing.thumbnail_path,
			body: existing.body
		});
		if (blockers.length > 0) {
			return { ok: false, error: blogPublishBlockersMessage(blockers) };
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
 * Detach this post’s featured image. Deletes the shared asset (+ storage)
 * only when no other posts still reference it.
 */
export async function clearBlogThumbnail(
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

		const previousAssetId = existing.thumbnail_asset_id;

		const { error } = await supabase
			.from('blog_posts')
			.update({
				thumbnail_path: null,
				thumbnail_asset_id: null,
				updated_by: user.id
			})
			.eq('id', postId);

		if (error) {
			return { ok: false, error: error.message };
		}

		await maybeGcThumbnailAsset(supabase, previousAssetId, postId);

		revalidateBlogPaths(existing.slug);
		return { ok: true, id: postId };
	} catch (error) {
		return fail(error, 'Could not clear featured image.');
	}
}

/**
 * Upload an image into `blog-images`.
 * Prefer FormData from the client: `postId`, `kind` (`thumbnail`|`body`), `file`.
 *
 * - `body`: writes `{postId}/body/{filename}` (unchanged).
 * - `thumbnail`: SHA-256 dedupe against `blog_thumbnail_assets`; reuses or
 *   creates under `thumbnails/{assetId}/...`. Does not update the post —
 *   caller should pass returned `path` + `assetId` to `updateDraft`.
 */
export async function uploadBlogImage(
	formData: FormData
): Promise<
	BlogActionResult<{ path: string; publicUrl: string; assetId?: string }>
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
				error: 'Please use a JPEG, PNG, WebP, or GIF image.'
			};
		}
		if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
			return {
				ok: false,
				error:
					'This photo is too large to upload. Please choose a smaller image (under about 10 MB) and try again.'
			};
		}

		const existing = await loadVisiblePost(supabase, postId);
		if (!existing) {
			return { ok: false, error: 'Post not found or deleted.' };
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const filename = sanitizeUploadFilename(file.name || 'image.jpg');

		if (kindRaw === 'body') {
			const path = `${postId}/body/${filename}`;
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
		}

		const contentSha256 = sha256Hex(buffer);
		const reused = await findThumbnailAssetByHash(supabase, contentSha256);
		if (reused) {
			const publicUrl = getBlogThumbnailUrl(reused.storage_path);
			if (!publicUrl) {
				return {
					ok: false,
					error: 'Could not build public URL for featured image.'
				};
			}
			return {
				ok: true,
				path: reused.storage_path,
				publicUrl,
				assetId: reused.id
			};
		}

		const assetId = randomUUID();
		const path = `thumbnails/${assetId}/${filename}`;
		const { error: uploadError } = await supabase.storage
			.from(BLOG_IMAGES_BUCKET)
			.upload(path, buffer, {
				contentType: file.type,
				upsert: false
			});

		if (uploadError) {
			return { ok: false, error: uploadError.message };
		}

		const { data: inserted, error: insertError } = await supabase
			.from('blog_thumbnail_assets')
			.insert({
				id: assetId,
				storage_path: path,
				content_sha256: contentSha256
			})
			.select('id, storage_path, content_sha256, last_used_at')
			.single();

		if (insertError || !inserted) {
			await supabase.storage.from(BLOG_IMAGES_BUCKET).remove([path]);
			// Race: another upload won the unique hash — reuse that asset.
			const raced = await findThumbnailAssetByHash(
				supabase,
				contentSha256
			);
			if (raced) {
				const publicUrl = getBlogThumbnailUrl(raced.storage_path);
				if (!publicUrl) {
					return {
						ok: false,
						error: 'Could not build public URL for featured image.'
					};
				}
				return {
					ok: true,
					path: raced.storage_path,
					publicUrl,
					assetId: raced.id
				};
			}
			return {
				ok: false,
				error: insertError?.message ?? 'Could not register featured image.'
			};
		}

		const publicUrl = getBlogThumbnailUrl(inserted.storage_path);
		if (!publicUrl) {
			return {
				ok: false,
				error: 'Upload succeeded but public URL could not be built.'
			};
		}

		return {
			ok: true,
			path: inserted.storage_path,
			publicUrl,
			assetId: inserted.id
		};
	} catch (error) {
		return fail(error, 'Upload failed.');
	}
}

export type PreviousBlogThumbnail = {
	assetId: string;
	path: string;
	publicUrl: string;
};

const PREVIOUS_THUMBNAIL_LIMIT = 36;

/**
 * Past featured images for the gallery (most recently used first).
 * Shared assets — no per-request content hashing.
 */
export async function listPreviousBlogThumbnails(): Promise<
	BlogActionResult<{ items: PreviousBlogThumbnail[] }>
> {
	try {
		const { supabase } = await requireAdmin();

		const { data, error } = await supabase
			.from('blog_thumbnail_assets')
			.select('id, storage_path')
			.order('last_used_at', { ascending: false })
			.limit(PREVIOUS_THUMBNAIL_LIMIT);

		if (error) {
			return { ok: false, error: error.message };
		}

		const items: PreviousBlogThumbnail[] = [];
		for (const row of data ?? []) {
			const publicUrl = getBlogThumbnailUrl(row.storage_path);
			if (!publicUrl) continue;
			items.push({
				assetId: row.id,
				path: row.storage_path,
				publicUrl
			});
		}

		return { ok: true, items };
	} catch (error) {
		return fail(error, 'Could not load previous featured images.');
	}
}

/**
 * Point this post at an existing shared featured-image asset (no storage copy).
 */
export async function attachBlogThumbnailAsset(input: {
	postId: string;
	assetId: string;
}): Promise<
	BlogActionResult<{ path: string; publicUrl: string; assetId: string }>
> {
	try {
		const { supabase, user } = await requireAdmin();
		const postId = input.postId?.trim();
		const assetId = input.assetId?.trim();

		if (!postId) return { ok: false, error: 'Post id is required.' };
		if (!assetId) {
			return { ok: false, error: 'Featured image asset is required.' };
		}

		const existing = await loadVisiblePost(supabase, postId);
		if (!existing) {
			return { ok: false, error: 'Post not found or deleted.' };
		}

		const asset = await loadThumbnailAsset(supabase, assetId);
		if (!asset) {
			return {
				ok: false,
				error: 'That image is not available to reuse.'
			};
		}

		if (existing.thumbnail_asset_id === asset.id) {
			const publicUrl = getBlogThumbnailUrl(asset.storage_path);
			if (!publicUrl) {
				return {
					ok: false,
					error: 'Could not build public URL for featured image.'
				};
			}
			return {
				ok: true,
				path: asset.storage_path,
				publicUrl,
				assetId: asset.id
			};
		}

		return setPostThumbnailAsset(supabase, {
			postId,
			userId: user.id,
			asset,
			previousAssetId: existing.thumbnail_asset_id,
			slug: existing.slug
		});
	} catch (error) {
		return fail(error, 'Could not attach featured image.');
	}
}

const COLLAPSE_HASH_CONCURRENCY = 6;

/**
 * Idempotent one-shot: hash existing `thumbnail_path` objects, collapse
 * duplicates into `blog_thumbnail_assets`, rewrite FKs/paths, delete orphan
 * storage objects that were superseded.
 *
 * Safe to re-run. Prefer the ops script with the service role for full GC
 * across soft-deleted posts if admin RLS ever hides them.
 */
export async function migrateCollapseBlogThumbnailAssets(): Promise<
	BlogActionResult<{
		assetsCreated: number;
		postsUpdated: number;
		orphansRemoved: number;
		skipped: number;
	}>
> {
	try {
		const { supabase } = await requireAdmin();

		const { data: posts, error: postsError } = await supabase
			.from('blog_posts')
			.select('id, thumbnail_path, thumbnail_asset_id')
			.not('thumbnail_path', 'is', null);

		if (postsError) {
			return { ok: false, error: postsError.message };
		}

		const pathToPosts = new Map<string, string[]>();
		for (const row of posts ?? []) {
			const path = row.thumbnail_path?.trim();
			if (!path) continue;
			const list = pathToPosts.get(path) ?? [];
			list.push(row.id);
			pathToPosts.set(path, list);
		}

		const distinctPaths = [...pathToPosts.keys()];
		const pathHash = new Map<string, string>();
		let skipped = 0;

		for (let i = 0; i < distinctPaths.length; i += COLLAPSE_HASH_CONCURRENCY) {
			const batch = distinctPaths.slice(i, i + COLLAPSE_HASH_CONCURRENCY);
			const hashes = await Promise.all(
				batch.map(async path => {
					const { data, error } = await supabase.storage
						.from(BLOG_IMAGES_BUCKET)
						.download(path);
					if (error || !data) return null;
					const buffer = Buffer.from(await data.arrayBuffer());
					if (buffer.length === 0) return null;
					return sha256Hex(buffer);
				})
			);
			for (let j = 0; j < batch.length; j++) {
				const hash = hashes[j];
				if (!hash) {
					skipped += pathToPosts.get(batch[j]!)?.length ?? 0;
					continue;
				}
				pathHash.set(batch[j]!, hash);
			}
		}

		const hashCanonical = new Map<
			string,
			{ assetId: string; storagePath: string }
		>();
		let assetsCreated = 0;
		let postsUpdated = 0;
		const supersededPaths = new Set<string>();

		for (const [path, hash] of pathHash) {
			let canonical = hashCanonical.get(hash);
			if (!canonical) {
				const existingAsset = await findThumbnailAssetByHash(
					supabase,
					hash
				);
				if (existingAsset) {
					canonical = {
						assetId: existingAsset.id,
						storagePath: existingAsset.storage_path
					};
				} else {
					const { data: inserted, error: insertError } = await supabase
						.from('blog_thumbnail_assets')
						.insert({
							storage_path: path,
							content_sha256: hash
						})
						.select('id, storage_path')
						.single();

					if (insertError || !inserted) {
						const raced = await findThumbnailAssetByHash(
							supabase,
							hash
						);
						if (!raced) {
							return {
								ok: false,
								error:
									insertError?.message ??
									`Could not create asset for ${path}.`
							};
						}
						canonical = {
							assetId: raced.id,
							storagePath: raced.storage_path
						};
					} else {
						canonical = {
							assetId: inserted.id,
							storagePath: inserted.storage_path
						};
						assetsCreated += 1;
					}
				}
				hashCanonical.set(hash, canonical);
			}

			if (path !== canonical.storagePath) {
				supersededPaths.add(path);
			}

			const postIds = pathToPosts.get(path) ?? [];
			for (const postId of postIds) {
				const row = (posts ?? []).find(p => p.id === postId);
				if (
					row?.thumbnail_asset_id === canonical.assetId &&
					row.thumbnail_path === canonical.storagePath
				) {
					continue;
				}
				const { error: updateError } = await supabase
					.from('blog_posts')
					.update({
						thumbnail_asset_id: canonical.assetId,
						thumbnail_path: canonical.storagePath
					})
					.eq('id', postId);
				if (updateError) {
					return { ok: false, error: updateError.message };
				}
				postsUpdated += 1;
			}
		}

		let orphansRemoved = 0;
		for (const path of supersededPaths) {
			const { data: assetOnPath } = await supabase
				.from('blog_thumbnail_assets')
				.select('id')
				.eq('storage_path', path)
				.maybeSingle();
			if (assetOnPath) continue;

			const { error: removeError } = await supabase.storage
				.from(BLOG_IMAGES_BUCKET)
				.remove([path]);
			if (!removeError) orphansRemoved += 1;
		}

		return {
			ok: true,
			assetsCreated,
			postsUpdated,
			orphansRemoved,
			skipped
		};
	} catch (error) {
		return fail(error, 'Could not collapse featured-image assets.');
	}
}
