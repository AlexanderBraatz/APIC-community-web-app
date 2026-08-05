/**
 * Map Places API (New) `regularOpeningHours.periods` into the listing
 * opening_hours JSON shape used by the app.
 * Mirrors lib/listings/opening-hours.ts googleRegularHoursToOpeningHours.
 */

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Google Places weekday: 0 = Sunday … 6 = Saturday. */
const GOOGLE_WEEKDAY_TO_DAY = {
	0: 'sun',
	1: 'mon',
	2: 'tue',
	3: 'wed',
	4: 'thu',
	5: 'fri',
	6: 'sat'
};

function formatGoogleTime(hour, minute) {
	if (hour == null || !Number.isFinite(hour)) return null;
	const h = Math.max(0, Math.min(23, Math.trunc(hour)));
	const m =
		minute == null || !Number.isFinite(minute)
			? 0
			: Math.max(0, Math.min(59, Math.trunc(minute)));
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * @param {{ periods?: Array<{ open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }> } | null | undefined} regularOpeningHours
 * @returns {{ days: Record<string, { status: 'open'; periods: { open: string; close: string }[] }> } | null}
 */
export function googleRegularHoursToOpeningHours(regularOpeningHours) {
	const periods = regularOpeningHours?.periods;
	if (!Array.isArray(periods) || periods.length === 0) return null;

	/** @type {Record<string, { open: string; close: string }[]>} */
	const byDay = {};

	for (const period of periods) {
		const openDay = period.open?.day;
		if (openDay == null || !(openDay in GOOGLE_WEEKDAY_TO_DAY)) continue;
		const dayKey = GOOGLE_WEEKDAY_TO_DAY[openDay];

		// 24-hour open (no close) — treat as unknown rather than inventing times
		if (!period.close) continue;

		const open = formatGoogleTime(period.open?.hour, period.open?.minute);
		const close = formatGoogleTime(period.close?.hour, period.close?.minute);
		if (!open || !close) continue;

		const list = byDay[dayKey] ?? [];
		if (list.length >= 2) continue;
		list.push({ open, close });
		byDay[dayKey] = list;
	}

	if (Object.keys(byDay).length === 0) return null;

	/** @type {Record<string, { status: 'open'; periods: { open: string; close: string }[] }>} */
	const days = {};
	for (const key of DAY_KEYS) {
		const dayPeriods = byDay[key];
		if (dayPeriods?.length) {
			days[key] = { status: 'open', periods: dayPeriods };
		}
	}

	return Object.keys(days).length ? { days } : null;
}

/**
 * True when opening_hours is already set with at least one day schedule.
 * @param {unknown} value
 */
export function hasOpeningHours(value) {
	if (value == null) return false;
	if (typeof value !== 'object') return false;
	const days = /** @type {{ days?: unknown }} */ (value).days;
	if (!days || typeof days !== 'object') return false;
	return Object.keys(days).length > 0;
}
