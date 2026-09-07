import type { Json } from '@/lib/supabase/database.types';

export const DAY_KEYS = [
	'mon',
	'tue',
	'wed',
	'thu',
	'fri',
	'sat',
	'sun'
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export type OpeningPeriod = {
	open: string;
	close: string;
};

export type DaySchedule =
	| { status: 'open'; periods: OpeningPeriod[] }
	| { status: 'closed' };

export type OpeningHours = {
	days: Partial<Record<DayKey, DaySchedule>>;
	note?: string;
};

export const DAY_LABELS: Record<DayKey, string> = {
	mon: 'Mon',
	tue: 'Tue',
	wed: 'Wed',
	thu: 'Thu',
	fri: 'Fri',
	sat: 'Sat',
	sun: 'Sun'
};

export function emptyOpeningHours(): OpeningHours {
	return { days: {} };
}

export function parseOpeningHours(value: unknown): OpeningHours | null {
	if (value == null) return null;
	if (typeof value === 'string') {
		try {
			return parseOpeningHours(JSON.parse(value));
		} catch {
			return null;
		}
	}
	if (typeof value !== 'object') return null;
	const raw = value as { days?: unknown; note?: unknown };
	if (!raw.days || typeof raw.days !== 'object') {
		return null;
	}

	const days: OpeningHours['days'] = {};
	for (const key of DAY_KEYS) {
		const entry = (raw.days as Record<string, unknown>)[key];
		if (!entry || typeof entry !== 'object') continue;
		const status = (entry as { status?: unknown }).status;
		if (status === 'closed') {
			days[key] = { status: 'closed' };
			continue;
		}
		if (status === 'open') {
			const periodsRaw = (entry as { periods?: unknown }).periods;
			if (!Array.isArray(periodsRaw)) continue;
			const periods: OpeningPeriod[] = [];
			for (const period of periodsRaw) {
				if (!period || typeof period !== 'object') continue;
				const open = String((period as { open?: unknown }).open ?? '').trim();
				const close = String((period as { close?: unknown }).close ?? '').trim();
				if (open && close) periods.push({ open, close });
			}
			if (periods.length) days[key] = { status: 'open', periods };
		}
	}

	const note =
		typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined;

	if (Object.keys(days).length === 0 && !note) return null;
	return note ? { days, note } : { days };
}

export function openingHoursToJson(value: OpeningHours | null): Json | null {
	if (!value) return null;
	if (Object.keys(value.days).length === 0 && !value.note) return null;
	return value as unknown as Json;
}

function formatPeriods(periods: OpeningPeriod[]): string {
	return periods.map(p => `${p.open}–${p.close}`).join(', ');
}

/** Compact scan-friendly lines for browse cards. */
export function formatOpeningHoursLines(hours: OpeningHours | null): string[] {
	if (!hours) return [];
	const lines: string[] = [];

	type Group = { label: string; text: string };
	const groups: Group[] = [];
	let runStart: DayKey | null = null;
	let runEnd: DayKey | null = null;
	let runText: string | null = null;

	function flush() {
		if (!runStart || !runText) return;
		const label =
			runEnd && runEnd !== runStart
				? `${DAY_LABELS[runStart]}–${DAY_LABELS[runEnd]}`
				: DAY_LABELS[runStart];
		groups.push({ label, text: runText });
		runStart = null;
		runEnd = null;
		runText = null;
	}

	for (const key of DAY_KEYS) {
		const entry = hours.days[key];
		const text = !entry
			? null
			: entry.status === 'closed'
				? 'Closed'
				: formatPeriods(entry.periods);

		if (text == null) {
			flush();
			continue;
		}
		if (runText === text && runStart) {
			runEnd = key;
			continue;
		}
		flush();
		runStart = key;
		runEnd = key;
		runText = text;
	}
	flush();

	for (const group of groups) {
		lines.push(`${group.label}: ${group.text}`);
	}
	if (hours.note) lines.push(hours.note);
	return lines;
}

export type DayFormStatus = 'unset' | 'open' | 'open_lunch' | 'closed';

export type DayFormState = {
	status: DayFormStatus;
	open1: string;
	close1: string;
	open2: string;
	close2: string;
};

export type OpeningHoursFormState = {
	days: Record<DayKey, DayFormState>;
	note: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeInput(value: string): boolean {
	return TIME_PATTERN.test(value.trim());
}

export function timeToMinutes(value: string): number | null {
	if (!isValidTimeInput(value)) return null;
	const [hours, minutes] = value.trim().split(':').map(Number);
	return hours * 60 + minutes;
}

function validatePeriod(
	open: string,
	close: string,
	labels: { both: string; order: string }
): string | null {
	const openTrimmed = open.trim();
	const closeTrimmed = close.trim();
	if (!openTrimmed && !closeTrimmed) return null;
	if (!openTrimmed || !closeTrimmed) return labels.both;
	if (!isValidTimeInput(openTrimmed) || !isValidTimeInput(closeTrimmed)) {
		return 'Use 24-hour times like 09:00.';
	}
	const openMins = timeToMinutes(openTrimmed);
	const closeMins = timeToMinutes(closeTrimmed);
	if (openMins == null || closeMins == null || closeMins <= openMins) {
		return labels.order;
	}
	return null;
}

/** Empty fields are fine (incomplete). Filled fields must be valid HH:MM and ordered. */
export function dayHoursValidationMessage(row: DayFormState): string | null {
	if (row.status !== 'open' && row.status !== 'open_lunch') return null;

	const firstError = validatePeriod(row.open1, row.close1, {
		both: 'Enter both open and close for the first period.',
		order: 'Closing time must be after opening time.'
	});
	if (firstError) return firstError;

	if (row.status === 'open_lunch') {
		const secondError = validatePeriod(row.open2, row.close2, {
			both: 'Enter both open and close for the after-lunch period.',
			order: 'After-lunch closing time must be after its opening time.'
		});
		if (secondError) return secondError;

		const p1Close = row.close1.trim();
		const p2Open = row.open2.trim();
		if (p1Close && p2Open && isValidTimeInput(p1Close) && isValidTimeInput(p2Open)) {
			const close1Mins = timeToMinutes(p1Close);
			const open2Mins = timeToMinutes(p2Open);
			if (close1Mins != null && open2Mins != null && open2Mins < close1Mins) {
				return 'After-lunch period must start after the first period ends.';
			}
		}
	}

	return null;
}

function emptyDayFormState(): DayFormState {
	return { status: 'unset', open1: '', close1: '', open2: '', close2: '' };
}

export function openingHoursToFormState(
	hours: OpeningHours | null
): OpeningHoursFormState {
	const days = {} as Record<DayKey, DayFormState>;
	for (const key of DAY_KEYS) {
		const entry = hours?.days[key];
		if (!entry) {
			days[key] = emptyDayFormState();
		} else if (entry.status === 'closed') {
			days[key] = {
				status: 'closed',
				open1: '',
				close1: '',
				open2: '',
				close2: ''
			};
		} else {
			const hasLunch = Boolean(entry.periods[1]);
			days[key] = {
				status: hasLunch ? 'open_lunch' : 'open',
				open1: entry.periods[0]?.open ?? '',
				close1: entry.periods[0]?.close ?? '',
				open2: entry.periods[1]?.open ?? '',
				close2: entry.periods[1]?.close ?? ''
			};
		}
	}
	return { days, note: hours?.note ?? '' };
}

export function formStateToOpeningHours(
	state: OpeningHoursFormState
): OpeningHours | null {
	const days: OpeningHours['days'] = {};
	for (const key of DAY_KEYS) {
		const row = state.days[key];
		if (row.status === 'closed') {
			days[key] = { status: 'closed' };
			continue;
		}
		if (row.status !== 'open' && row.status !== 'open_lunch') continue;
		if (dayHoursValidationMessage(row)) continue;

		const periods: OpeningPeriod[] = [];
		if (isValidTimeInput(row.open1) && isValidTimeInput(row.close1)) {
			periods.push({ open: row.open1.trim(), close: row.close1.trim() });
		}
		if (
			row.status === 'open_lunch' &&
			isValidTimeInput(row.open2) &&
			isValidTimeInput(row.close2)
		) {
			periods.push({ open: row.open2.trim(), close: row.close2.trim() });
		}
		if (periods.length) days[key] = { status: 'open', periods };
	}
	const note = state.note.trim() || undefined;
	if (Object.keys(days).length === 0 && !note) return null;
	return note ? { days, note } : { days };
}

/** Google Places weekday: 0 = Sunday … 6 = Saturday. */
const GOOGLE_WEEKDAY_TO_DAY: Record<number, DayKey> = {
	0: 'sun',
	1: 'mon',
	2: 'tue',
	3: 'wed',
	4: 'thu',
	5: 'fri',
	6: 'sat'
};

function formatGoogleTime(hour?: number, minute?: number): string | null {
	if (hour == null || !Number.isFinite(hour)) return null;
	const h = Math.max(0, Math.min(23, Math.trunc(hour)));
	const m =
		minute == null || !Number.isFinite(minute)
			? 0
			: Math.max(0, Math.min(59, Math.trunc(minute)));
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type GoogleOpeningPeriod = {
	open?: { day?: number; hour?: number; minute?: number };
	close?: { day?: number; hour?: number; minute?: number };
};

/**
 * Map Places API (New) `regularOpeningHours.periods` into our OpeningHours shape.
 * Returns null if periods are missing or cannot be mapped cleanly.
 */
export function googleRegularHoursToOpeningHours(
	regularOpeningHours: { periods?: GoogleOpeningPeriod[] } | null | undefined
): OpeningHours | null {
	const periods = regularOpeningHours?.periods;
	if (!Array.isArray(periods) || periods.length === 0) return null;

	const byDay: Partial<Record<DayKey, OpeningPeriod[]>> = {};

	for (const period of periods) {
		const openDay = period.open?.day;
		if (openDay == null || !(openDay in GOOGLE_WEEKDAY_TO_DAY)) continue;
		const dayKey = GOOGLE_WEEKDAY_TO_DAY[openDay];

		// 24-hour open (no close) — treat as unknown rather than inventing 00:00–24:00
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

	const days: OpeningHours['days'] = {};
	for (const key of DAY_KEYS) {
		const dayPeriods = byDay[key];
		if (dayPeriods?.length) {
			days[key] = { status: 'open', periods: dayPeriods };
		}
	}

	return Object.keys(days).length ? { days } : null;
}
