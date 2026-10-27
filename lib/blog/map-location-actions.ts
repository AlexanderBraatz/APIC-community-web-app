'use server';

import { requireAdmin } from '@/lib/admin/require-admin';
import { isBlogMapPostId } from '@/lib/blog/map-post-id';
import { createClient } from '@/lib/supabase/server';

// `blog_map_locations.post_id` is uuid FK → blog_posts(id) (Stage 7).

export type BlogMapLocation = {
	postId: string;
	address: string | null;
	sourceUrl: string | null;
	lat: number;
	lng: number;
};

export type UpsertBlogMapLocationInput = {
	postId: string;
	address: string | null;
	sourceUrl: string | null;
	lat: number;
	lng: number;
};

function normalizePostId(postId: string): string | null {
	const trimmed = postId.trim();
	if (!isBlogMapPostId(trimmed)) return null;
	return trimmed;
}

function mapRow(row: {
	post_id: string;
	address: string | null;
	source_url: string | null;
	latitude: number;
	longitude: number;
}): BlogMapLocation {
	return {
		postId: row.post_id,
		address: row.address,
		sourceUrl: row.source_url,
		lat: row.latitude,
		lng: row.longitude
	};
}

export async function getBlogMapLocation(
	postId: string
): Promise<BlogMapLocation | null> {
	const id = normalizePostId(postId);
	if (!id) return null;

	const supabase = await createClient();
	const { data, error } = await supabase
		.from('blog_map_locations')
		.select('post_id, address, source_url, latitude, longitude')
		.eq('post_id', id)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}
	if (!data) return null;
	return mapRow(data);
}

export async function upsertBlogMapLocation(
	input: UpsertBlogMapLocationInput
): Promise<BlogMapLocation> {
	const { supabase, user } = await requireAdmin();

	const postId = normalizePostId(input.postId);
	if (!postId) {
		throw new Error('Invalid post ID');
	}

	const lat = input.lat;
	const lng = input.lng;
	if (
		!Number.isFinite(lat) ||
		!Number.isFinite(lng) ||
		lat < -90 ||
		lat > 90 ||
		lng < -180 ||
		lng > 180
	) {
		throw new Error('A valid map pin is required');
	}

	const address = input.address?.trim() || null;
	const sourceUrl = input.sourceUrl?.trim() || null;

	const { data: existing } = await supabase
		.from('blog_map_locations')
		.select('post_id')
		.eq('post_id', postId)
		.maybeSingle();

	const payload = {
		post_id: postId,
		address,
		source_url: sourceUrl,
		latitude: lat,
		longitude: lng,
		updated_by: user.id,
		...(existing ? {} : { created_by: user.id })
	};

	const { data, error } = await supabase
		.from('blog_map_locations')
		.upsert(payload, { onConflict: 'post_id' })
		.select('post_id, address, source_url, latitude, longitude')
		.single();

	if (error) {
		throw new Error(error.message);
	}

	return mapRow(data);
}

/** Remove a map pin for a post. No-op if none exists. */
export async function deleteBlogMapLocation(
	postId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase } = await requireAdmin();
		const id = normalizePostId(postId);
		if (!id) {
			return { ok: false, error: 'Invalid post ID' };
		}

		const { error } = await supabase
			.from('blog_map_locations')
			.delete()
			.eq('post_id', id);

		if (error) {
			return { ok: false, error: error.message };
		}

		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Delete failed.'
		};
	}
}
