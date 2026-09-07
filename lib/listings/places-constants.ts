/** Public map landmark — Castelfalfi. */
export const CASTELFALFI_CENTER = {
	latitude: 43.548442,
	longitude: 10.856672
} as const;

/** Default Autocomplete bias: circle around Castelfalfi. */
export const PLACES_RADIUS_DEFAULT_M = 30_000;

/**
 * Widened Autocomplete bias: ~200 km × 200 km viewport centered on Castelfalfi
 * (±100 km). Used instead of a circle because Places Autocomplete caps circle
 * radius at 50 km.
 */
export const PLACES_BIAS_EXPANDED_RECTANGLE = {
	low: { latitude: 42.650131, longitude: 9.617267 },
	high: { latitude: 44.446753, longitude: 12.096077 }
} as const;
