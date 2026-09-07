/**
 * Enrich listings from Google Places API (New) by name.
 *
 * Overwrites address / lat / lng / source_url. Optionally fills empty type and
 * opening_hours. Never changes contacts. Records progress on
 * places_enrichment_status + places_enrichment_notes.
 *
 * Usage (repo root):
 *   node --env-file=.env.local scripts/enrich-listings-places.mjs --dry-run
 *   node --env-file=.env.local scripts/enrich-listings-places.mjs --dry-run --limit 5
 *   node --env-file=.env.local scripts/enrich-listings-places.mjs --id <uuid>
 *   node --env-file=.env.local scripts/enrich-listings-places.mjs
 *   node --env-file=.env.local scripts/enrich-listings-places.mjs --retry
 */

import { createClient } from '@supabase/supabase-js';
import {
	googleRegularHoursToOpeningHours,
	hasOpeningHours
} from './lib/google-opening-hours.mjs';

const CASTELFALFI_CENTER = {
	latitude: 43.548442,
	longitude: 10.856672
};
const PLACES_RADIUS_DEFAULT_M = 30_000;
/** ~200 km × 200 km viewport (±100 km) centered on Castelfalfi. */
const PLACES_BIAS_EXPANDED_RECTANGLE = {
	low: { latitude: 42.650131, longitude: 9.617267 },
	high: { latitude: 44.446753, longitude: 12.096077 }
};
const REQUEST_DELAY_MS = 250;

function requireEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

function placesApiKey() {
	return (
		process.env.GOOGLE_PLACES_API_KEY?.trim() ||
		process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
		process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
		''
	);
}

function parseArgs(argv) {
	const dryRun = argv.includes('--dry-run');
	const retry = argv.includes('--retry');
	let limit = null;
	let id = null;
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === '--limit' && argv[i + 1]) {
			limit = Number.parseInt(argv[i + 1], 10);
			if (!Number.isFinite(limit) || limit < 1) {
				throw new Error('--limit must be a positive integer');
			}
		}
		if (argv[i] === '--id' && argv[i + 1]) {
			id = argv[i + 1].trim();
		}
	}
	return { dryRun, retry, limit, id };
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} input
 * @param {boolean} expanded
 * @param {string} key
 * @returns {Promise<{ ok: true; suggestions: { placeId: string; primaryText: string; secondaryText: string }[] } | { ok: false; error: string }>}
 */
async function placesAutocomplete(input, expanded, key) {
	const body = {
		input,
		includedRegionCodes: ['it'],
		locationBias: expanded
			? { rectangle: PLACES_BIAS_EXPANDED_RECTANGLE }
			: {
					circle: {
						center: CASTELFALFI_CENTER,
						radius: PLACES_RADIUS_DEFAULT_M
					}
				}
	};

	const response = await fetch(
		'https://places.googleapis.com/v1/places:autocomplete',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': key
			},
			body: JSON.stringify(body)
		}
	);

	const payload = await response.json();
	if (!response.ok) {
		return {
			ok: false,
			error:
				payload.error?.message ||
				`Places Autocomplete HTTP ${response.status}`
		};
	}

	const suggestions = [];
	for (const item of payload.suggestions ?? []) {
		const pred = item.placePrediction;
		if (!pred) continue;
		const placeId =
			pred.placeId?.trim() ||
			pred.place?.replace(/^places\//, '').trim() ||
			'';
		if (!placeId) continue;
		const primaryText =
			pred.structuredFormat?.mainText?.text?.trim() ||
			pred.text?.text?.trim() ||
			'';
		const secondaryText =
			pred.structuredFormat?.secondaryText?.text?.trim() || '';
		if (!primaryText) continue;
		suggestions.push({ placeId, primaryText, secondaryText });
		if (suggestions.length >= 8) break;
	}

	return { ok: true, suggestions };
}

/**
 * @param {string} placeId
 * @param {string} key
 */
async function placeDetails(placeId, key) {
	const id = placeId.trim().replace(/^places\//, '');
	if (!id) return { ok: false, error: 'Missing place id.' };

	const fieldMask = [
		'id',
		'displayName',
		'formattedAddress',
		'location',
		'googleMapsUri',
		'regularOpeningHours',
		'primaryTypeDisplayName',
		'primaryType',
		'types'
	].join(',');

	const response = await fetch(
		`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
		{
			method: 'GET',
			headers: {
				'X-Goog-Api-Key': key,
				'X-Goog-FieldMask': fieldMask
			}
		}
	);

	const payload = await response.json();
	if (!response.ok) {
		return {
			ok: false,
			error: payload.error?.message || `Place Details HTTP ${response.status}`
		};
	}

	const lat =
		payload.location?.latitude != null &&
		Number.isFinite(payload.location.latitude)
			? payload.location.latitude
			: null;
	const lng =
		payload.location?.longitude != null &&
		Number.isFinite(payload.location.longitude)
			? payload.location.longitude
			: null;

	const primaryType =
		typeof payload.primaryTypeDisplayName === 'string'
			? payload.primaryTypeDisplayName.trim()
			: payload.primaryTypeDisplayName?.text?.trim() || null;
	const placesPrimaryType =
		typeof payload.primaryType === 'string' && payload.primaryType.trim()
			? payload.primaryType.trim()
			: null;
	const placesTypes = Array.isArray(payload.types)
		? payload.types.filter((item) => typeof item === 'string' && item.trim())
		: [];

	return {
		ok: true,
		place: {
			placeId: payload.id?.replace(/^places\//, '') || id,
			displayName: payload.displayName?.text?.trim() || null,
			address: payload.formattedAddress?.trim() || null,
			lat,
			lng,
			sourceUrl: payload.googleMapsUri?.trim() || null,
			openingHours: googleRegularHoursToOpeningHours(
				payload.regularOpeningHours
			),
			primaryType: primaryType || null,
			placesPrimaryType,
			placesTypes
		}
	};
}

/**
 * Find first autocomplete hit, widening to the expanded rectangle if needed.
 * @param {string} name
 * @param {string} key
 */
async function findPlaceForName(name, key) {
	const first = await placesAutocomplete(name, false, key);
	if (!first.ok) return first;
	if (first.suggestions.length > 0) {
		return {
			ok: true,
			suggestion: first.suggestions[0],
			expanded: false
		};
	}

	await sleep(REQUEST_DELAY_MS);
	const second = await placesAutocomplete(name, true, key);
	if (!second.ok) return second;
	if (second.suggestions.length > 0) {
		return {
			ok: true,
			suggestion: second.suggestions[0],
			expanded: true
		};
	}

	return { ok: true, suggestion: null, expanded: true };
}

function buildUpdatedNotes(listing, place, extras) {
	const parts = [
		`Matched “${place.displayName || place.placeId}” (places/${place.placeId}).`,
		'Overwrote address/lat/lng/source_url.'
	];
	if (extras.filledType) {
		parts.push(`Filled type “${place.primaryType}”.`);
	} else if (!listing.type?.trim() && !place.primaryType) {
		parts.push('Left type empty (Places had no primaryTypeDisplayName).');
	} else {
		parts.push('Left type unchanged (already set).');
	}
	if (extras.filledHours) {
		parts.push('Filled opening_hours.');
	} else if (!hasOpeningHours(listing.opening_hours) && !place.openingHours) {
		parts.push('Left opening_hours empty (Places had no hours).');
	} else {
		parts.push('Left opening_hours unchanged (already set).');
	}
	return parts.join(' ');
}

async function main() {
	const { dryRun, retry, limit, id } = parseArgs(process.argv.slice(2));
	const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
	const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
	const key = placesApiKey();
	if (!key) {
		throw new Error(
			'Missing GOOGLE_PLACES_API_KEY (or GOOGLE_GEOCODING_API_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).'
		);
	}

	const supabase = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	let query = supabase
		.from('listings')
		.select(
			'id, name, type, address, latitude, longitude, source_url, opening_hours, places_enrichment_status'
		)
		.order('name');

	if (id) {
		query = query.eq('id', id);
	} else if (retry) {
		query = query.in('places_enrichment_status', [
			'pending',
			'not_found',
			'error'
		]);
	} else {
		query = query.eq('places_enrichment_status', 'pending');
	}

	if (limit) query = query.limit(limit);

	const { data: rows, error } = await query;
	if (error) throw new Error(error.message);

	const listings = rows ?? [];
	console.log(
		`${dryRun ? 'Dry-run' : 'Enrich'} starting: ${listings.length} listing(s)` +
			(id ? ` (id=${id})` : '') +
			(retry ? ' (--retry)' : '')
	);

	const tally = { updated: 0, not_found: 0, error: 0 };

	for (const listing of listings) {
		const name = listing.name?.trim() || '';
		if (!name) {
			const notes = 'Skipped: listing has empty name.';
			console.log(`--- ${listing.id}: empty name → error`);
			tally.error += 1;
			if (!dryRun) {
				const { error: updateError } = await supabase
					.from('listings')
					.update({
						places_enrichment_status: 'error',
						places_enrichment_notes: notes
					})
					.eq('id', listing.id);
				if (updateError) {
					throw new Error(
						`Update failed for ${listing.id}: ${updateError.message}`
					);
				}
			}
			continue;
		}

		await sleep(REQUEST_DELAY_MS);
		const found = await findPlaceForName(name, key);
		if (!found.ok) {
			const notes = found.error;
			console.log(`--- ${name}: error — ${notes}`);
			tally.error += 1;
			if (!dryRun) {
				const { error: updateError } = await supabase
					.from('listings')
					.update({
						places_enrichment_status: 'error',
						places_enrichment_notes: notes
					})
					.eq('id', listing.id);
				if (updateError) {
					throw new Error(`Update failed for ${name}: ${updateError.message}`);
				}
			}
			continue;
		}

		if (!found.suggestion) {
			const notes = `No Place found for name “${name}” within ~100 km of Castelfalfi (200×200 km bias).`;
			console.log(`--- ${name}: not_found`);
			tally.not_found += 1;
			if (!dryRun) {
				const { error: updateError } = await supabase
					.from('listings')
					.update({
						places_enrichment_status: 'not_found',
						places_enrichment_notes: notes
					})
					.eq('id', listing.id);
				if (updateError) {
					throw new Error(`Update failed for ${name}: ${updateError.message}`);
				}
			} else {
				console.log(`    ${notes}`);
			}
			continue;
		}

		await sleep(REQUEST_DELAY_MS);
		const details = await placeDetails(found.suggestion.placeId, key);
		if (!details.ok) {
			const notes = details.error;
			console.log(`--- ${name}: error — ${notes}`);
			tally.error += 1;
			if (!dryRun) {
				const { error: updateError } = await supabase
					.from('listings')
					.update({
						places_enrichment_status: 'error',
						places_enrichment_notes: notes
					})
					.eq('id', listing.id);
				if (updateError) {
					throw new Error(`Update failed for ${name}: ${updateError.message}`);
				}
			}
			continue;
		}

		const place = details.place;
		if (place.lat == null || place.lng == null) {
			const notes = `Matched “${place.displayName || place.placeId}” (places/${place.placeId}) but Place Details had no coordinates.`;
			console.log(`--- ${name}: error — no coords`);
			tally.error += 1;
			if (!dryRun) {
				const { error: updateError } = await supabase
					.from('listings')
					.update({
						places_enrichment_status: 'error',
						places_enrichment_notes: notes
					})
					.eq('id', listing.id);
				if (updateError) {
					throw new Error(`Update failed for ${name}: ${updateError.message}`);
				}
			}
			continue;
		}

		const fillType = !listing.type?.trim() && Boolean(place.primaryType);
		const fillHours =
			!hasOpeningHours(listing.opening_hours) && Boolean(place.openingHours);
		const notes = buildUpdatedNotes(listing, place, {
			filledType: fillType,
			filledHours: fillHours
		});

		/** @type {Record<string, unknown>} */
		const patch = {
			address: place.address,
			latitude: place.lat,
			longitude: place.lng,
			source_url: place.sourceUrl,
			places_enrichment_status: 'updated',
			places_enrichment_notes: notes,
			places_primary_type: place.placesPrimaryType,
			places_types: place.placesTypes
		};
		if (fillType) patch.type = place.primaryType;
		if (fillHours) patch.opening_hours = place.openingHours;

		console.log(`--- ${name}: updated`);
		console.log(
			`    → ${place.displayName} | ${place.address} | ${place.lat},${place.lng}`
		);
		console.log(`    ${notes}`);
		tally.updated += 1;

		if (!dryRun) {
			const { error: updateError } = await supabase
				.from('listings')
				.update(patch)
				.eq('id', listing.id);
			if (updateError) {
				throw new Error(`Update failed for ${name}: ${updateError.message}`);
			}
		}
	}

	console.log(
		`${dryRun ? 'Dry-run complete' : 'Enrich complete'}: ` +
			`updated=${tally.updated} not_found=${tally.not_found} error=${tally.error}`
	);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
