import type { CategorySlug } from '@/lib/listings-search';
import { CATEGORY_SLUGS } from '@/lib/listings-search';
import type { ListingContact } from '@/lib/listings/contacts';
import type { OpeningHours } from '@/lib/listings/opening-hours';

export type AdminListing = {
	id: string;
	name: string;
	type: string | null;
	address: string | null;
	contacts: ListingContact[];
	notes: string | null;
	openingHours: OpeningHours | null;
	category: CategorySlug;
	sourceUrl: string | null;
	lat: number | null;
	lng: number | null;
	tags: string[];
	updatedAt: string;
};

export type GeocodeCandidate = {
	formattedAddress: string;
	lat: number;
	lng: number;
	placeId: string | null;
};

export type PlacesAutocompleteMode = 'business' | 'address';

export type PlaceSuggestion = {
	placeId: string;
	primaryText: string;
	secondaryText: string;
};

export type PlaceAutofill = {
	name: string | null;
	address: string | null;
	contacts: ListingContact[];
	sourceUrl: string | null;
	lat: number | null;
	lng: number | null;
	openingHours: OpeningHours | null;
};

export type ListingInput = {
	name: string;
	type: string | null;
	address: string | null;
	contacts: ListingContact[];
	notes: string | null;
	openingHours: OpeningHours | null;
	category: CategorySlug;
	sourceUrl: string | null;
	lat: number | null;
	lng: number | null;
	tags: string[];
};

export function isCategorySlug(value: string): value is CategorySlug {
	return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function parseTags(raw: string | string[]): string[] {
	const parts = Array.isArray(raw)
		? raw
		: raw.split(/[,\n]/).map(part => part.trim());

	const seen = new Set<string>();
	const tags: string[] = [];
	for (const part of parts) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		tags.push(trimmed);
	}
	return tags;
}

export function parseOptionalCoord(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}
