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

export type DayFormState = {
	closed: boolean;
	open1: string;
	close1: string;
	open2: string;
	close2: string;
};

export type OpeningHoursFormState = {
	days: Record<DayKey, DayFormState>;
	note: string;
};

export function openingHoursToFormState(
	hours: OpeningHours | null
): OpeningHoursFormState {
	const days = {} as Record<DayKey, DayFormState>;
	for (const key of DAY_KEYS) {
		const entry = hours?.days[key];
		if (!entry) {
			days[key] = { closed: false, open1: '', close1: '', open2: '', close2: '' };
		} else if (entry.status === 'closed') {
			days[key] = { closed: true, open1: '', close1: '', open2: '', close2: '' };
		} else {
			days[key] = {
				closed: false,
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
		if (row.closed) {
			days[key] = { status: 'closed' };
			continue;
		}
		const periods: OpeningPeriod[] = [];
		if (row.open1.trim() && row.close1.trim()) {
			periods.push({ open: row.open1.trim(), close: row.close1.trim() });
		}
		if (row.open2.trim() && row.close2.trim()) {
			periods.push({ open: row.open2.trim(), close: row.close2.trim() });
		}
		if (periods.length) days[key] = { status: 'open', periods };
	}
	const note = state.note.trim() || undefined;
	if (Object.keys(days).length === 0 && !note) return null;
	return note ? { days, note } : { days };
}
