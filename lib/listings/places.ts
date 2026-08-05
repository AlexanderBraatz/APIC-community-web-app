'use server';

import { requireAdmin } from '@/lib/admin/require-admin';
import { limitPlaces } from '@/lib/admin/rate-limit';
import { placeAutofillToContacts } from '@/lib/listings/contacts';
import { googleRegularHoursToOpeningHours } from '@/lib/listings/opening-hours';
import {
	CASTELFALFI_CENTER,
	PLACES_RADIUS_DEFAULT_M,
	PLACES_RADIUS_EXPANDED_M
} from '@/lib/listings/places-constants';
import type {
	PlaceAutofill,
	PlacesAutocompleteMode,
	PlaceSuggestion
} from '@/lib/listings/types';

function placesApiKey() {
	return (
		process.env.GOOGLE_PLACES_API_KEY?.trim() ||
		process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
		process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
		''
	);
}

function normalizeRadius(radiusMeters: number | undefined): number {
	if (radiusMeters === PLACES_RADIUS_EXPANDED_M) return PLACES_RADIUS_EXPANDED_M;
	return PLACES_RADIUS_DEFAULT_M;
}

type AutocompleteSuggestion = {
	placePrediction?: {
		placeId?: string;
		place?: string;
		structuredFormat?: {
			mainText?: { text?: string };
			secondaryText?: { text?: string };
		};
		text?: { text?: string };
	};
};

type PlaceDetailsResponse = {
	id?: string;
	displayName?: { text?: string };
	formattedAddress?: string;
	location?: { latitude?: number; longitude?: number };
	nationalPhoneNumber?: string;
	internationalPhoneNumber?: string;
	websiteUri?: string;
	googleMapsUri?: string;
	regularOpeningHours?: {
		periods?: {
			open?: { day?: number; hour?: number; minute?: number };
			close?: { day?: number; hour?: number; minute?: number };
		}[];
	};
	error?: { message?: string; status?: string };
};

function includedPrimaryTypes(mode: PlacesAutocompleteMode): string[] | undefined {
	if (mode === 'address') {
		return ['street_address', 'route', 'premise', 'subpremise'];
	}
	// Business step: leave unrestricted so rural Italian POIs still surface.
	return undefined;
}

export async function placesAutocomplete(opts: {
	input: string;
	mode: PlacesAutocompleteMode;
	radiusMeters?: number;
}): Promise<
	{ ok: true; suggestions: PlaceSuggestion[] } | { ok: false; error: string }
> {
	try {
		const { user } = await requireAdmin();
		const rate = limitPlaces(user.id);
		if (!rate.ok) return { ok: false, error: rate.error };

		const input = opts.input.trim();
		if (input.length < 2) {
			return { ok: true, suggestions: [] };
		}

		const key = placesApiKey();
		if (!key) {
			return {
				ok: false,
				error:
					'Missing GOOGLE_PLACES_API_KEY (or GOOGLE_GEOCODING_API_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).'
			};
		}

		const radius = normalizeRadius(opts.radiusMeters);
		const body: Record<string, unknown> = {
			input,
			includedRegionCodes: ['it'],
			locationBias: {
				circle: {
					center: CASTELFALFI_CENTER,
					radius
				}
			}
		};
		const types = includedPrimaryTypes(opts.mode);
		if (types) body.includedPrimaryTypes = types;

		const response = await fetch(
			'https://places.googleapis.com/v1/places:autocomplete',
			{
				method: 'POST',
				cache: 'no-store',
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': key
				},
				body: JSON.stringify(body)
			}
		);

		const payload = (await response.json()) as {
			suggestions?: AutocompleteSuggestion[];
			error?: { message?: string; status?: string };
		};

		if (!response.ok) {
			return {
				ok: false,
				error:
					payload.error?.message ||
					`Places Autocomplete HTTP ${response.status}`
			};
		}

		const suggestions: PlaceSuggestion[] = [];
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
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error ? error.message : 'Places Autocomplete failed.'
		};
	}
}

export async function placeDetails(
	placeId: string
): Promise<{ ok: true; place: PlaceAutofill } | { ok: false; error: string }> {
	try {
		const { user } = await requireAdmin();
		const rate = limitPlaces(user.id);
		if (!rate.ok) return { ok: false, error: rate.error };

		const id = placeId.trim().replace(/^places\//, '');
		if (!id) return { ok: false, error: 'Missing place id.' };

		const key = placesApiKey();
		if (!key) {
			return {
				ok: false,
				error:
					'Missing GOOGLE_PLACES_API_KEY (or GOOGLE_GEOCODING_API_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).'
			};
		}

		const fieldMask = [
			'id',
			'displayName',
			'formattedAddress',
			'location',
			'nationalPhoneNumber',
			'internationalPhoneNumber',
			'websiteUri',
			'regularOpeningHours',
			'googleMapsUri'
		].join(',');

		const response = await fetch(
			`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
			{
				method: 'GET',
				cache: 'no-store',
				headers: {
					'X-Goog-Api-Key': key,
					'X-Goog-FieldMask': fieldMask
				}
			}
		);

		const payload = (await response.json()) as PlaceDetailsResponse;

		if (!response.ok) {
			return {
				ok: false,
				error:
					payload.error?.message || `Place Details HTTP ${response.status}`
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

		const hasCoords = lat !== null && lng !== null;

		const place: PlaceAutofill = {
			name: payload.displayName?.text?.trim() || null,
			address: payload.formattedAddress?.trim() || null,
			contacts: placeAutofillToContacts({
				phone:
					payload.internationalPhoneNumber?.trim() ||
					payload.nationalPhoneNumber?.trim() ||
					null,
				website: payload.websiteUri?.trim() || null
			}),
			sourceUrl: payload.googleMapsUri?.trim() || null,
			lat: hasCoords ? lat : null,
			lng: hasCoords ? lng : null,
			openingHours: googleRegularHoursToOpeningHours(payload.regularOpeningHours)
		};

		return { ok: true, place };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Place Details failed.'
		};
	}
}
