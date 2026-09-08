'use server';

import { requireAdmin } from '@/lib/admin/require-admin';
import { createClient } from '@/lib/supabase/server';
import { isNumericPostId } from '@/tina/blog-post-id';

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
	if (!isNumericPostId(trimmed)) return null;
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
