'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
	isCategorySlug,
	parseOptionalCoord,
	parseTags,
	type AdminListing,
	type GeocodeCandidate,
	type ListingInput
} from '@/lib/listings/types';
import type { CategorySlug } from '@/lib/listings-search';

type ListingRow = {
	id: string;
	name: string;
	type: string | null;
	address: string | null;
	contact: string | null;
	remark: string | null;
	category: CategorySlug;
	source_url: string | null;
	latitude: number | null;
	longitude: number | null;
	updated_at: string;
	listing_tag_assignments:
		| {
				listing_tags: { name: string } | { name: string }[] | null;
		  }[]
		| null;
};

function tagsFromAssignments(
	assignments: ListingRow['listing_tag_assignments']
): string[] {
	if (!assignments?.length) return [];
	const tags: string[] = [];
	const seen = new Set<string>();
	for (const assignment of assignments) {
		const raw = assignment.listing_tags;
		const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
		for (const tag of rows) {
			const name = tag.name?.trim();
			if (!name) continue;
			const key = name.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			tags.push(name);
		}
	}
	return tags;
}

function mapAdminListing(row: ListingRow): AdminListing {
	return {
		id: row.id,
		name: row.name,
		type: row.type,
		address: row.address,
		contact: row.contact,
		remark: row.remark,
		category: row.category,
		sourceUrl: row.source_url,
		lat: row.latitude,
		lng: row.longitude,
		tags: tagsFromAssignments(row.listing_tag_assignments),
		updatedAt: row.updated_at
	};
}

const LISTING_SELECT = `
	id,
	name,
	type,
	address,
	contact,
	remark,
	category,
	source_url,
	latitude,
	longitude,
	updated_at,
	listing_tag_assignments (
		listing_tags ( name )
	)
`;

async function writeAudit(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	payload: {
		action: string;
		targetId: string;
		summary: string;
		oldValues?: Record<string, unknown> | null;
		newValues?: Record<string, unknown> | null;
	}
) {
	const { error } = await supabase.rpc('write_admin_audit', {
		p_action: payload.action,
		p_target_type: 'listing',
		p_target_id: payload.targetId,
		p_summary: payload.summary,
		p_old_values: payload.oldValues ?? null,
		p_new_values: payload.newValues ?? null
	});
	if (error) {
		throw new Error(error.message);
	}
}

function geocodeApiKey() {
	return (
		process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
		process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
		''
	);
}

function listingPayload(input: ListingInput, userId: string) {
	return {
		name: input.name,
		type: input.type,
		address: input.address,
		contact: input.contact,
		remark: input.remark,
		category: input.category,
		source_url: input.sourceUrl,
		latitude: input.lat,
		longitude: input.lng,
		updated_by: userId
	};
}

async function syncListingTags(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	listingId: string,
	tags: string[],
	userId: string
) {
	const { error: clearError } = await supabase
		.from('listing_tag_assignments')
		.delete()
		.eq('listing_id', listingId);
	if (clearError) throw new Error(clearError.message);

	if (tags.length === 0) return;

	const { data: existingTags, error: listError } = await supabase
		.from('listing_tags')
		.select('id, name');
	if (listError) throw new Error(listError.message);

	const idByLower = new Map(
		(existingTags ?? []).map(row => [row.name.trim().toLowerCase(), row.id])
	);

	const toInsert: { name: string; created_by: string }[] = [];
	for (const tag of tags) {
		const key = tag.toLowerCase();
		if (!idByLower.has(key)) {
			toInsert.push({ name: tag, created_by: userId });
		}
	}

	if (toInsert.length) {
		const { data: inserted, error: insertError } = await supabase
			.from('listing_tags')
			.insert(toInsert)
			.select('id, name');
		if (insertError) throw new Error(insertError.message);
		for (const row of inserted ?? []) {
			idByLower.set(row.name.trim().toLowerCase(), row.id);
		}

		await writeAudit(supabase, {
			action: 'tag.create',
			targetId: 'batch',
			summary: `Created ${toInsert.length} listing tag(s)`,
			newValues: { tags: toInsert.map(t => t.name) }
		});
	}

	const assignments = tags.map(tag => {
		const id = idByLower.get(tag.toLowerCase());
		if (!id) throw new Error(`Missing tag id for ${tag}`);
		return { listing_id: listingId, tag_id: id };
	});

	const { error: assignError } = await supabase
		.from('listing_tag_assignments')
		.insert(assignments);
	if (assignError) throw new Error(assignError.message);
}

function parseListingForm(formData: FormData): ListingInput | { error: string } {
	const name = String(formData.get('name') ?? '').trim();
	const category = String(formData.get('category') ?? '').trim();
	const lat = parseOptionalCoord(formData.get('latitude'));
	const lng = parseOptionalCoord(formData.get('longitude'));

	if (!name) return { error: 'Name is required.' };
	if (!isCategorySlug(category)) return { error: 'Choose a valid category.' };
	if ((lat === null) !== (lng === null)) {
		return { error: 'Latitude and longitude must both be set or both empty.' };
	}
	if (lat !== null && (lat < -90 || lat > 90)) {
		return { error: 'Latitude must be between -90 and 90.' };
	}
	if (lng !== null && (lng < -180 || lng > 180)) {
		return { error: 'Longitude must be between -180 and 180.' };
	}

	const address = String(formData.get('address') ?? '').trim();

	return {
		name,
		type: String(formData.get('type') ?? '').trim() || null,
		address: address || null,
		contact: String(formData.get('contact') ?? '').trim() || null,
		remark: String(formData.get('remark') ?? '').trim() || null,
		category,
		sourceUrl: String(formData.get('source_url') ?? '').trim() || null,
		lat,
		lng,
		tags: parseTags(String(formData.get('tags') ?? ''))
	};
}

function revalidateListingPaths(category?: string) {
	revalidatePath('/members/admin/listings');
	if (category) revalidatePath(`/${category}`);
	for (const slug of ['food-dining', 'services-maintenance', 'health-wellness', 'shop-market']) {
		revalidatePath(`/${slug}`);
	}
}

export async function listAdminListings(opts?: {
	category?: string | null;
	q?: string | null;
}): Promise<AdminListing[]> {
	const { supabase } = await requireAdmin();
	let query = supabase
		.from('listings')
		.select(LISTING_SELECT)
		.order('name', { ascending: true });

	if (opts?.category && isCategorySlug(opts.category)) {
		query = query.eq('category', opts.category);
	}

	const { data, error } = await query;
	if (error) throw new Error(error.message);

	let rows = ((data ?? []) as ListingRow[]).map(mapAdminListing);
	const q = opts?.q?.trim().toLowerCase();
	if (q) {
		rows = rows.filter(
			row =>
				row.name.toLowerCase().includes(q) ||
				row.address?.toLowerCase().includes(q) ||
				row.tags.some(tag => tag.toLowerCase().includes(q))
		);
	}
	return rows;
}

export async function getAdminListing(id: string): Promise<AdminListing | null> {
	const { supabase } = await requireAdmin();
	const { data, error } = await supabase
		.from('listings')
		.select(LISTING_SELECT)
		.eq('id', id)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data ? mapAdminListing(data as ListingRow) : null;
}

export async function listAllTagNames(): Promise<string[]> {
	const { supabase } = await requireAdmin();
	const { data, error } = await supabase
		.from('listing_tags')
		.select('name')
		.order('name', { ascending: true });
	if (error) throw new Error(error.message);
	return (data ?? []).map(row => row.name);
}

export async function createListing(
	formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
	try {
		const { supabase, user } = await requireAdmin();
		const parsed = parseListingForm(formData);
		if ('error' in parsed) return { ok: false, error: parsed.error };

		const { data, error } = await supabase
			.from('listings')
			.insert({
				...listingPayload(parsed, user.id),
				created_by: user.id
			})
			.select('id')
			.single();
		if (error) return { ok: false, error: error.message };

		await syncListingTags(supabase, data.id, parsed.tags, user.id);
		await writeAudit(supabase, {
			action: 'listing.create',
			targetId: data.id,
			summary: `Created listing “${parsed.name}”`,
			newValues: { ...parsed }
		});
		revalidateListingPaths(parsed.category);
		return { ok: true, id: data.id };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Create failed.'
		};
	}
}

export async function updateListing(
	id: string,
	formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase, user } = await requireAdmin();
		const existing = await getAdminListing(id);
		if (!existing) return { ok: false, error: 'Listing not found.' };

		const parsed = parseListingForm(formData);
		if ('error' in parsed) return { ok: false, error: parsed.error };

		const { error } = await supabase
			.from('listings')
			.update(listingPayload(parsed, user.id))
			.eq('id', id);
		if (error) return { ok: false, error: error.message };

		await syncListingTags(supabase, id, parsed.tags, user.id);
		await writeAudit(supabase, {
			action: 'listing.update',
			targetId: id,
			summary: `Updated listing “${parsed.name}”`,
			oldValues: { ...existing },
			newValues: { ...parsed }
		});
		revalidateListingPaths(parsed.category);
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Update failed.'
		};
	}
}

export async function deleteListing(
	id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase } = await requireAdmin();
		const existing = await getAdminListing(id);
		if (!existing) return { ok: false, error: 'Listing not found.' };

		const { error } = await supabase.from('listings').delete().eq('id', id);
		if (error) return { ok: false, error: error.message };

		await writeAudit(supabase, {
			action: 'listing.delete',
			targetId: id,
			summary: `Deleted listing “${existing.name}”`,
			oldValues: { ...existing }
		});
		revalidateListingPaths(existing.category);
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Delete failed.'
		};
	}
}

export async function geocodeListing(
	address: string
): Promise<
	{ ok: true; candidates: GeocodeCandidate[] } | { ok: false; error: string }
> {
	try {
		await requireAdmin();
		const trimmed = address.trim();
		if (!trimmed) return { ok: false, error: 'Enter an address to geocode.' };

		const key = geocodeApiKey();
		if (!key) {
			return {
				ok: false,
				error:
					'Missing GOOGLE_GEOCODING_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).'
			};
		}

		const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
		url.searchParams.set('address', trimmed);
		url.searchParams.set('key', key);

		const response = await fetch(url.toString(), { cache: 'no-store' });
		if (!response.ok) {
			return { ok: false, error: `Geocoding HTTP ${response.status}` };
		}

		const body = (await response.json()) as {
			status: string;
			error_message?: string;
			results?: {
				formatted_address: string;
				place_id?: string;
				geometry: { location: { lat: number; lng: number } };
			}[];
		};

		if (body.status === 'ZERO_RESULTS') {
			return { ok: true, candidates: [] };
		}
		if (body.status !== 'OK') {
			return {
				ok: false,
				error: body.error_message || `Geocoding failed (${body.status}).`
			};
		}

		const candidates = (body.results ?? []).slice(0, 8).map(result => ({
			formattedAddress: result.formatted_address,
			lat: result.geometry.location.lat,
			lng: result.geometry.location.lng,
			placeId: result.place_id ?? null
		}));

		return { ok: true, candidates };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Geocoding failed.'
		};
	}
}

export async function geocodeMissingListings(): Promise<
	| { ok: true; updated: number; skipped: number; failed: number }
	| { ok: false; error: string }
> {
	try {
		const { supabase, user } = await requireAdmin();
		const key = geocodeApiKey();
		if (!key) {
			return {
				ok: false,
				error:
					'Missing GOOGLE_GEOCODING_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).'
			};
		}

		const { data, error } = await supabase
			.from('listings')
			.select('id, name, address, category')
			.is('latitude', null)
			.not('address', 'is', null);
		if (error) return { ok: false, error: error.message };

		let updated = 0;
		let skipped = 0;
		let failed = 0;

		for (const row of data ?? []) {
			const address = row.address?.trim();
			if (!address) {
				skipped += 1;
				continue;
			}

			const result = await geocodeListing(address);
			if (!result.ok) {
				failed += 1;
				continue;
			}
			if (result.candidates.length !== 1) {
				skipped += 1;
				continue;
			}

			const candidate = result.candidates[0];
			const { error: updateError } = await supabase
				.from('listings')
				.update({
					latitude: candidate.lat,
					longitude: candidate.lng,
					updated_by: user.id
				})
				.eq('id', row.id);
			if (updateError) {
				failed += 1;
				continue;
			}

			await writeAudit(supabase, {
				action: 'listing.geocode',
				targetId: row.id,
				summary: `Auto-geocoded “${row.name}”`,
				newValues: {
					lat: candidate.lat,
					lng: candidate.lng,
					formattedAddress: candidate.formattedAddress
				}
			});
			updated += 1;
		}

		revalidateListingPaths();
		return { ok: true, updated, skipped, failed };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Batch geocode failed.'
		};
	}
}
