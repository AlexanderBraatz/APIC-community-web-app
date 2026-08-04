import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Idempotent seed from content/data/listings.json (service role).
 *
 * Usage (repo root):
 *   node --env-file=.env.local scripts/seed-listings.mjs
 */

const CATEGORIES = new Set([
	'food-dining',
	'services-maintenance',
	'health-wellness',
	'shop-market'
]);

function requireEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing ${name}`);
	}
	return value;
}

function loadJson() {
	const path = resolve(process.cwd(), 'content/data/listings.json');
	return JSON.parse(readFileSync(path, 'utf8'));
}

async function main() {
	const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
	const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
	const supabase = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	const payload = loadJson();
	const rawListings = payload.listings ?? [];
	if (!Array.isArray(rawListings) || rawListings.length === 0) {
		throw new Error('No listings found in content/data/listings.json');
	}

	/** @type {Map<string, string>} lower(tag) -> display name */
	const tagDisplay = new Map();
	for (const listing of rawListings) {
		for (const tag of listing.tags ?? []) {
			const trimmed = String(tag).trim();
			if (!trimmed) continue;
			const key = trimmed.toLowerCase();
			if (!tagDisplay.has(key)) tagDisplay.set(key, trimmed);
		}
	}

	const { data: existingTags, error: listTagsError } = await supabase
		.from('listing_tags')
		.select('id, name');
	if (listTagsError) {
		throw new Error(`Failed to read listing_tags: ${listTagsError.message}`);
	}

	/** @type {Map<string, string>} */
	const tagIdByLower = new Map(
		(existingTags ?? []).map(row => [row.name.trim().toLowerCase(), row.id])
	);

	const tagsToInsert = [];
	for (const [lower, name] of tagDisplay) {
		if (!tagIdByLower.has(lower)) tagsToInsert.push({ name });
	}

	if (tagsToInsert.length) {
		const { data: insertedTags, error: insertTagsError } = await supabase
			.from('listing_tags')
			.insert(tagsToInsert)
			.select('id, name');
		if (insertTagsError) {
			throw new Error(`Failed to insert tags: ${insertTagsError.message}`);
		}
		for (const row of insertedTags ?? []) {
			tagIdByLower.set(row.name.trim().toLowerCase(), row.id);
		}
	}

	const { data: existingListings, error: listError } = await supabase
		.from('listings')
		.select('id, name, category');
	if (listError) {
		throw new Error(`Failed to read listings: ${listError.message}`);
	}

	/** @type {Map<string, string>} `${category}::${lower(name)}` -> id */
	const listingIdByKey = new Map(
		(existingListings ?? []).map(row => [
			`${row.category}::${row.name.trim().toLowerCase()}`,
			row.id
		])
	);

	let listingCount = 0;
	let assignmentCount = 0;

	for (const listing of rawListings) {
		const category = listing.category;
		if (!CATEGORIES.has(category)) {
			throw new Error(`Invalid category for ${listing.name}: ${category}`);
		}

		const lat =
			typeof listing.lat === 'number' && Number.isFinite(listing.lat)
				? listing.lat
				: null;
		const lng =
			typeof listing.lng === 'number' && Number.isFinite(listing.lng)
				? listing.lng
				: null;

		const row = {
			name: String(listing.name).trim(),
			type: listing.type ? String(listing.type) : null,
			address: listing.address ? String(listing.address) : null,
			phone: listing.phone ? String(listing.phone) : null,
			email: listing.email ? String(listing.email) : null,
			website: listing.website ? String(listing.website) : null,
			notes: listing.notes ? String(listing.notes) : null,
			opening_hours: listing.openingHours ?? null,
			category,
			source_url: listing.sourceUrl ? String(listing.sourceUrl) : null,
			latitude: lat,
			longitude: lng
		};

		const key = `${category}::${row.name.toLowerCase()}`;
		let listingId = listingIdByKey.get(key);

		if (listingId) {
			const { error: updateError } = await supabase
				.from('listings')
				.update(row)
				.eq('id', listingId);
			if (updateError) {
				throw new Error(`Update failed for ${row.name}: ${updateError.message}`);
			}
		} else {
			const { data: inserted, error: insertError } = await supabase
				.from('listings')
				.insert(row)
				.select('id')
				.single();
			if (insertError) {
				throw new Error(`Insert failed for ${row.name}: ${insertError.message}`);
			}
			listingId = inserted.id;
			listingIdByKey.set(key, listingId);
		}

		listingCount += 1;

		const { error: clearError } = await supabase
			.from('listing_tag_assignments')
			.delete()
			.eq('listing_id', listingId);
		if (clearError) {
			throw new Error(
				`Clear assignments failed for ${row.name}: ${clearError.message}`
			);
		}

		const assignmentRows = [];
		const seen = new Set();
		for (const tag of listing.tags ?? []) {
			const tagKey = String(tag).trim().toLowerCase();
			if (!tagKey || seen.has(tagKey)) continue;
			seen.add(tagKey);
			const tagId = tagIdByLower.get(tagKey);
			if (!tagId) {
				throw new Error(`Missing tag id for "${tag}" on ${row.name}`);
			}
			assignmentRows.push({ listing_id: listingId, tag_id: tagId });
		}

		if (assignmentRows.length) {
			const { error: assignError } = await supabase
				.from('listing_tag_assignments')
				.insert(assignmentRows);
			if (assignError) {
				throw new Error(
					`Assign tags failed for ${row.name}: ${assignError.message}`
				);
			}
			assignmentCount += assignmentRows.length;
		}
	}

	console.log(
		`Seeded ${listingCount} listings, ${tagIdByLower.size} tags, ${assignmentCount} assignments.`
	);
	console.log(
		'Note: most listings lack lat/lng — map pins appear after PR-06 geocoding.'
	);
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
