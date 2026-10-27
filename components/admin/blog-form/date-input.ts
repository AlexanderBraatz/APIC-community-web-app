/** Format an ISO timestamp for `<input type="date" />` (`YYYY-MM-DD`). */
export function toDateInputValue(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Parse a date-only input value to ISO for `timestamptz` storage.
 * Uses noon UTC so the calendar day is stable across timezones.
 */
export function fromDateInputValue(value: string): string | null {
	const trimmed = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
	const [year, month, day] = trimmed.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
	if (
		Number.isNaN(date.getTime()) ||
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}
	return date.toISOString();
}
