import type { CategorySlug } from '@/lib/listings-search';
import { normalizeLabel, tagKey } from '@/lib/listings/tag-resolution';

/** Noise Places types never mapped to listing tags. */
export const PLACES_TYPE_DENY = new Set([
	'point_of_interest',
	'establishment',
	'geocode',
	'political',
	'locality',
	'sublocality',
	'sublocality_level_1',
	'sublocality_level_2',
	'neighborhood',
	'route',
	'street_address',
	'premise',
	'subpremise',
	'postal_code',
	'plus_code',
	'country',
	'administrative_area_level_1',
	'administrative_area_level_2',
	'administrative_area_level_3',
	'floor',
	'room',
	'parking',
	'parking_lot',
	'general_contractor',
	'food',
	'store',
	'health'
]);

/**
 * Useful Places type → canonical listing tag name(s).
 * Values should match existing seed casing where possible.
 */
export const PLACES_TYPE_TAG_MAP: Record<string, string | string[]> = {
	restaurant: 'restaurant',
	italian_restaurant: ['restaurant', 'tuscan'],
	seafood_restaurant: ['restaurant', 'fish'],
	pizza_restaurant: 'pizza',
	meal_takeaway: 'restaurant',
	meal_delivery: 'restaurant',
	cafe: 'coffee',
	coffee_shop: 'coffee',
	bakery: 'bakery',
	bar: 'wine',
	wine_bar: 'wine',
	winery: 'winery',
	liquor_store: 'wine',
	dentist: 'dentist',
	dental_clinic: 'dentist',
	pharmacy: 'pharmacy',
	doctor: 'doctor',
	hospital: 'hospital',
	physiotherapist: 'physiotherapy',
	chiropractor: 'chiropractic',
	veterinary_care: 'veterinary',
	beauty_salon: 'beauty',
	hair_care: 'hair-salon',
	hair_salon: 'hair-salon',
	spa: 'health-wellness',
	gym: 'fitness',
	supermarket: 'supermarket',
	grocery_store: 'supermarket',
	convenience_store: 'supermarket',
	clothing_store: 'fashion',
	electronics_store: 'electronics',
	hardware_store: 'hardware',
	pet_store: 'pets',
	florist: 'gardening',
	electrician: 'electrical',
	plumber: 'hvac-plumbing',
	roofing_contractor: 'services-maintenance',
	locksmith: 'services-maintenance',
	painter: 'services-maintenance',
	moving_company: 'services-maintenance',
	car_repair: 'automotive',
	car_dealer: 'automotive',
	real_estate_agency: 'real-estate',
	travel_agency: 'services-maintenance',
	optician: 'eye-care',
	university: 'hospital'
};

/** Types that only restate a listing category — skip when they add no detail. */
const CATEGORY_ONLY_TAGS: Record<CategorySlug, Set<string>> = {
	'food-dining': new Set(['food-dining', 'food & dining']),
	'services-maintenance': new Set([
		'services-maintenance',
		'services & maintenance'
	]),
	'health-wellness': new Set(['health-wellness', 'health & wellness']),
	'shop-market': new Set(['shop-market', 'shop & market'])
};

export function mapPlacesTypesToTagNames(opts: {
	types: string[];
	primaryType?: string | null;
	category?: CategorySlug | null;
}): string[] {
	const ordered: string[] = [];
	const seenTypes = new Set<string>();

	const pushType = (raw: string | null | undefined) => {
		if (!raw) return;
		const key = raw.trim();
		if (!key || seenTypes.has(key)) return;
		seenTypes.add(key);
		ordered.push(key);
	};

	pushType(opts.primaryType);
	for (const t of opts.types) pushType(t);

	const categorySkip = opts.category
		? CATEGORY_ONLY_TAGS[opts.category]
		: null;
	const out: string[] = [];
	const seenTags = new Set<string>();

	for (const placeType of ordered) {
		if (PLACES_TYPE_DENY.has(placeType)) continue;
		const mapped = PLACES_TYPE_TAG_MAP[placeType];
		if (!mapped) continue;
		const names = Array.isArray(mapped) ? mapped : [mapped];
		for (const name of names) {
			const normalized = normalizeLabel(name);
			if (!normalized) continue;
			const key = tagKey(normalized);
			if (categorySkip?.has(key)) continue;
			if (seenTags.has(key)) continue;
			seenTags.add(key);
			out.push(normalized);
		}
	}

	return out;
}
