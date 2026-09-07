import type { ListingContact } from '@/lib/listings/contacts';
import type { OpeningHours } from '@/lib/listings/opening-hours';

export type Listing = {
	name: string;
	type: string | null;
	address: string | null;
	contacts: ListingContact[];
	notes: string | null;
	openingHours: OpeningHours | null;
	category: string;
	sourceUrl: string;
	tags: string[];
	/** Present when the listing has been geocoded (e.g. from a database). */
	lat?: number | null;
	lng?: number | null;
};

export type ListingWithCoords = Listing & {
	lat: number;
	lng: number;
};

export function listingHasCoords(
	listing: Listing
): listing is ListingWithCoords {
	return (
		typeof listing.lat === 'number' &&
		Number.isFinite(listing.lat) &&
		typeof listing.lng === 'number' &&
		Number.isFinite(listing.lng)
	);
}

export const CATEGORY_SLUGS = [
	'food-dining',
	'services-maintenance',
	'health-wellness',
	'shop-market'
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export function categoryFromPathname(pathname: string): CategorySlug | null {
	const segment = pathname.replace(/^\//, '').split('/')[0] ?? '';
	return (CATEGORY_SLUGS as readonly string[]).includes(segment)
		? (segment as CategorySlug)
		: null;
}

export function filterByCategory(
	listings: Listing[],
	categorySlug: string | null
): Listing[] {
	if (!categorySlug) return listings;
	return listings.filter(listing => listing.category === categorySlug);
}

export function collectTags(listings: Listing[]): string[] {
	const seen = new Set<string>();
	const tags: string[] = [];

	for (const listing of listings) {
		for (const tag of listing.tags) {
			const key = tag.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			tags.push(tag);
		}
	}

	return tags;
}

export function normalize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s&+-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Higher score = better match. 0 = no match. */
export function fuzzyScore(query: string, text: string): number {
	const q = normalize(query);
	if (!q) return 0;

	const t = normalize(text);
	if (!t) return 0;

	if (t === q) return 100;
	if (t.startsWith(q)) return 80;
	if (t.includes(` ${q}`)) return 60;
	if (t.includes(q)) return 40;

	const tokens = t.split(' ');
	if (tokens.some(token => token.startsWith(q))) return 70;

	return 0;
}

export function listingMatchesQuery(
	listing: Listing,
	query: string,
	aliasMap?: Map<string, string[]>
): boolean {
	if (!normalize(query)) return true;

	if (fuzzyScore(query, listing.name) > 0) return true;
	if (listing.type && fuzzyScore(query, listing.type) > 0) return true;
	if (listing.tags.some(tag => fuzzyScore(query, tag) > 0)) return true;

	if (aliasMap && aliasMap.size > 0) {
		for (const [aliasKey, canonicals] of aliasMap) {
			if (fuzzyScore(query, aliasKey) <= 0) continue;
			if (
				canonicals.some(canonical =>
					listing.tags.some(tag => tag.toLowerCase() === canonical.toLowerCase())
				)
			) {
				return true;
			}
		}
	}

	return false;
}

export function listingHasAllTags(listing: Listing, activeTags: string[]): boolean {
	if (activeTags.length === 0) return true;

	const listingKeys = new Set(listing.tags.map(tag => tag.toLowerCase()));
	return activeTags.every(tag => listingKeys.has(tag.toLowerCase()));
}

export function filterListings(
	listings: Listing[],
	activeTags: string[],
	query = '',
	aliasMap?: Map<string, string[]>
): Listing[] {
	return listings.filter(
		listing =>
			listingHasAllTags(listing, activeTags) &&
			listingMatchesQuery(listing, query, aliasMap)
	);
}

const SUGGESTION_LIMIT = 6;

export function suggest(
	query: string,
	listings: Listing[],
	activeTags: string[] = [],
	aliasMap?: Map<string, string[]>
): { tags: string[]; places: Listing[] } {
	const q = normalize(query);
	if (!q) return { tags: [], places: [] };

	const activeKeys = new Set(activeTags.map(tag => tag.toLowerCase()));
	const scoped = listings.filter(listing => listingHasAllTags(listing, activeTags));
	const availableTags = collectTags(scoped).filter(
		tag => !activeKeys.has(tag.toLowerCase())
	);

	const aliasCanonicalHits = new Set<string>();
	if (aliasMap) {
		for (const [aliasKey, canonicals] of aliasMap) {
			if (fuzzyScore(query, aliasKey) <= 0) continue;
			for (const canonical of canonicals) {
				if (activeKeys.has(canonical.toLowerCase())) continue;
				if (availableTags.some(tag => tag.toLowerCase() === canonical.toLowerCase())) {
					aliasCanonicalHits.add(canonical);
				}
			}
		}
	}

	const rankedTags = [
		...availableTags.map(tag => ({ tag, score: fuzzyScore(query, tag) })),
		...[...aliasCanonicalHits].map(tag => ({
			tag,
			score: Math.max(35, fuzzyScore(query, tag))
		}))
	]
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
		.filter((item, index, arr) =>
			arr.findIndex(other => other.tag.toLowerCase() === item.tag.toLowerCase()) ===
			index
		)
		.slice(0, SUGGESTION_LIMIT)
		.map(item => item.tag);

	const rankedPlaces = scoped
		.map(listing => ({
			listing,
			score: Math.max(
				fuzzyScore(query, listing.name),
				listing.type ? fuzzyScore(query, listing.type) : 0,
				...listing.tags.map(tag => fuzzyScore(query, tag) * 0.5),
				...(aliasMap
					? [...aliasMap.entries()].flatMap(([aliasKey, canonicals]) => {
							const aliasHit = fuzzyScore(query, aliasKey);
							if (aliasHit <= 0) return [0];
							const onListing = canonicals.some(canonical =>
								listing.tags.some(
									tag => tag.toLowerCase() === canonical.toLowerCase()
								)
							);
							return onListing ? [aliasHit * 0.45] : [0];
						})
					: [0])
			)
		}))
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score || a.listing.name.localeCompare(b.listing.name))
		.slice(0, SUGGESTION_LIMIT)
		.map(item => item.listing);

	return { tags: rankedTags, places: rankedPlaces };
}
