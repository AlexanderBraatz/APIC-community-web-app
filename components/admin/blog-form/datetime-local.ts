/** Format an ISO timestamp for `<input type="datetime-local" />`. */
export function toDatetimeLocalValue(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse datetime-local value to ISO, or null if empty/invalid. */
export function fromDatetimeLocalValue(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const date = new Date(trimmed);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString();
}
