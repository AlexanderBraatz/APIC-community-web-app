'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/require-admin';
import { limitGeocode, limitGeocodeBatch } from '@/lib/admin/rate-limit';
import type { Json } from '@/lib/supabase/database.types';
import {
	isCategorySlug,
	parseOptionalCoord,
	parseTags,
	type AdminListing,
	type GeocodeCandidate,
	type KnownTag,
	type ListingInput
} from '@/lib/listings/types';
import {
	contactsToJson,
	parseContacts,
	parseContactsForm
} from '@/lib/listings/contacts';
import {
	openingHoursToJson,
	parseOpeningHours
} from '@/lib/listings/opening-hours';
import {
	arrayToPendingMerges
} from '@/lib/listings/tag-suggest';
import { mergeAliasesIntoTags } from '@/lib/listings/tag-alias-persist';
import { backfillEmptyAliasesForNames } from '@/lib/listings/tag-suggest-actions';
import {
	normalizeLabel,
	resolveTagInputs,
	type TagRecord
} from '@/lib/listings/tag-resolution';
import type { CategorySlug } from '@/lib/listings-search';

type ListingRow = {
	id: string;
	name: string;
	type: string | null;
	address: string | null;
	contacts: Json;
	notes: string | null;
	opening_hours: Json | null;
	category: CategorySlug;
	source_url: string | null;
	latitude: number | null;
	longitude: number | null;
	places_primary_type: string | null;
	places_types: string[] | null;
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
		contacts: parseContacts(row.contacts),
		notes: row.notes,
		openingHours: parseOpeningHours(row.opening_hours),
		category: row.category,
		sourceUrl: row.source_url,
		lat: row.latitude,
		lng: row.longitude,
		tags: tagsFromAssignments(row.listing_tag_assignments),
		placesPrimaryType: row.places_primary_type ?? null,
		placesTypes: Array.isArray(row.places_types) ? row.places_types : [],
		updatedAt: row.updated_at
	};
}

const LISTING_SELECT = `
	id,
	name,
	type,
	address,
	contacts,
	notes,
	opening_hours,
	category,
	source_url,
	latitude,
	longitude,
	places_primary_type,
	places_types,
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
		p_old_values: (payload.oldValues ?? null) as Json | null,
		p_new_values: (payload.newValues ?? null) as Json | null
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
		contacts: contactsToJson(input.contacts),
		notes: input.notes,
		opening_hours: openingHoursToJson(input.openingHours),
		category: input.category,
		source_url: input.sourceUrl,
		latitude: input.lat,
		longitude: input.lng,
		places_primary_type: input.placesPrimaryType,
		places_types: input.placesTypes,
		updated_by: userId
	};
}

function parsePlacesTypesField(raw: string): string[] {
	if (!raw.trim()) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((item): item is string => typeof item === 'string')
			.map(normalizeLabel)
			.filter(Boolean);
	} catch {
		return [];
	}
}

function parsePendingAliasMerges(
	raw: string
): Map<string, string[]> {
	if (!raw.trim()) return new Map();
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return new Map();
		return arrayToPendingMerges(
			parsed.filter(
				(item): item is { canonical: string; aliases: string[] } =>
					Boolean(item) &&
					typeof item === 'object' &&
					typeof (item as { canonical?: unknown }).canonical === 'string' &&
					Array.isArray((item as { aliases?: unknown }).aliases)
			)
		);
	} catch {
		return new Map();
	}
}

async function syncListingTags(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	listingId: string,
	tags: string[],
	userId: string
): Promise<{ createdNames: string[] }> {
	const { error: clearError } = await supabase
		.from('listing_tag_assignments')
		.delete()
		.eq('listing_id', listingId);
	if (clearError) throw new Error(clearError.message);

	if (tags.length === 0) return { createdNames: [] };

	const { data: existingTags, error: listError } = await supabase
		.from('listing_tags')
		.select('id, name, aliases');
	if (listError) throw new Error(listError.message);

	const vocabulary: TagRecord[] = (existingTags ?? []).map(row => ({
		id: row.id,
		name: row.name,
		aliases: Array.isArray(row.aliases) ? row.aliases : []
	}));

	const resolved = resolveTagInputs(tags, vocabulary);
	const invalid = resolved.find(r => r.status === 'invalid');
	if (invalid && invalid.status === 'invalid') {
		throw new Error(`Invalid tag “${invalid.raw}”: ${invalid.reason}`);
	}

	const tagIds: string[] = [];
	const toInsert: { name: string; created_by: string; aliases: string[] }[] =
		[];
	const createdNames: string[] = [];

	for (const result of resolved) {
		if (result.status === 'matched') {
			tagIds.push(result.tag.id);
			continue;
		}
		if (result.status === 'unresolved') {
			toInsert.push({
				name: result.normalized,
				created_by: userId,
				aliases: []
			});
			createdNames.push(result.normalized);
		}
	}

	if (toInsert.length) {
		const { data: inserted, error: insertError } = await supabase
			.from('listing_tags')
			.insert(toInsert)
			.select('id, name');
		if (insertError) throw new Error(insertError.message);
		for (const row of inserted ?? []) {
			tagIds.push(row.id);
		}

		await writeAudit(supabase, {
			action: 'tag.create',
			targetId: 'batch',
			summary: `Created ${toInsert.length} listing tag(s)`,
			newValues: { tags: toInsert.map(t => t.name) }
		});
	}

	const uniqueAssignments = [
		...new Map(tagIds.map(id => [id, { listing_id: listingId, tag_id: id }]))
	].map(([, row]) => row);

	const { error: assignError } = await supabase
		.from('listing_tag_assignments')
		.insert(uniqueAssignments);
	if (assignError) throw new Error(assignError.message);

	return { createdNames };
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
	const contactsParsed = parseContactsForm(
		String(formData.get('contacts_json') ?? '').trim() || null
	);
	if ('error' in contactsParsed) return contactsParsed;

	return {
		name,
		type: String(formData.get('type') ?? '').trim() || null,
		address: address || null,
		contacts: contactsParsed,
		notes: String(formData.get('notes') ?? '').trim() || null,
		openingHours: parseOpeningHours(
			String(formData.get('opening_hours') ?? '').trim() || null
		),
		category,
		sourceUrl: String(formData.get('source_url') ?? '').trim() || null,
		lat,
		lng,
		tags: parseTags(String(formData.get('tags') ?? '')),
		placesPrimaryType:
			String(formData.get('places_primary_type') ?? '').trim() || null,
		placesTypes: parsePlacesTypesField(
			String(formData.get('places_types') ?? '')
		)
	};
}

function revalidateListingPaths(category?: string) {
	revalidatePath('/members/admin');
	revalidatePath('/members/admin/listings');
	revalidatePath('/members/admin/audit-log');
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
				row.contacts.some(c => c.value.toLowerCase().includes(q)) ||
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
	const tags = await listKnownTags();
	return tags.map(tag => tag.name);
}

export async function listKnownTags(): Promise<KnownTag[]> {
	const { supabase } = await requireAdmin();
	const { data, error } = await supabase
		.from('listing_tags')
		.select('id, name, aliases')
		.order('name', { ascending: true });
	if (error) throw new Error(error.message);
	return (data ?? []).map(row => ({
		id: row.id,
		name: row.name,
		aliases: Array.isArray(row.aliases) ? row.aliases : []
	}));
}

async function persistListingTagsAndAliases(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	listingId: string,
	parsed: ListingInput,
	userId: string,
	formData: FormData
) {
	const { createdNames } = await syncListingTags(
		supabase,
		listingId,
		parsed.tags,
		userId
	);

	const pendingMerges = parsePendingAliasMerges(
		String(formData.get('pending_alias_merges') ?? '')
	);
	try {
		await mergeAliasesIntoTags(supabase, pendingMerges);
	} catch {
		// Alias merge must not fail the listing save.
	}

	try {
		await backfillEmptyAliasesForNames(supabase, createdNames);
	} catch {
		// Save-time alias generation is best-effort.
	}
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

		await persistListingTagsAndAliases(
			supabase,
			data.id,
			parsed,
			user.id,
			formData
		);
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

		await persistListingTagsAndAliases(
			supabase,
			id,
			parsed,
			user.id,
			formData
		);
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
		const { user } = await requireAdmin();
		const rate = limitGeocode(user.id);
		if (!rate.ok) {
			return { ok: false, error: rate.error };
		}
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
		const rate = limitGeocodeBatch(user.id);
		if (!rate.ok) {
			return { ok: false, error: rate.error };
		}
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
