import type { Json } from '@/lib/supabase/database.types';

export const CONTACT_KINDS = [
	'phone',
	'mobile',
	'whatsapp',
	'email',
	'website'
] as const;

export type ContactKind = (typeof CONTACT_KINDS)[number];

export type ListingContact = {
	kind: ContactKind;
	value: string;
	label?: string | null;
};

export const CONTACT_KIND_LABELS: Record<ContactKind, string> = {
	phone: 'Phone',
	mobile: 'Mobile',
	whatsapp: 'WhatsApp',
	email: 'Email',
	website: 'Website'
};

/** Kinds that Places autofill may overwrite. */
const AUTOFILL_KINDS = new Set<ContactKind>(['phone', 'website']);

export function isContactKind(value: string): value is ContactKind {
	return (CONTACT_KINDS as readonly string[]).includes(value);
}

const CONTACT_KIND_ORDER = new Map(
	CONTACT_KINDS.map((kind, index) => [kind, index])
);

/** Stable sort: phone → mobile → whatsapp → email → website. */
export function sortByContactKind<T extends { kind: ContactKind }>(
	items: T[]
): T[] {
	return [...items].sort(
		(a, b) =>
			(CONTACT_KIND_ORDER.get(a.kind) ?? 99) -
			(CONTACT_KIND_ORDER.get(b.kind) ?? 99)
	);
}

function normalizeWebsite(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return '';
	return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeContactValue(
	kind: ContactKind,
	raw: string
): string | { error: string } {
	const value = raw.trim();
	if (!value) return { error: 'Contact value is required.' };

	if (kind === 'email') {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
			return { error: 'Enter a valid email address.' };
		}
		return value;
	}

	if (kind === 'website') {
		return normalizeWebsite(value);
	}

	// phone / mobile / whatsapp
	return value;
}

export function parseContacts(value: unknown): ListingContact[] {
	if (value == null) return [];
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return [];
		try {
			return parseContacts(JSON.parse(trimmed));
		} catch {
			return [];
		}
	}
	if (!Array.isArray(value)) return [];

	const contacts: ListingContact[] = [];
	for (const item of value) {
		if (!item || typeof item !== 'object') continue;
		const kindRaw = String((item as { kind?: unknown }).kind ?? '').trim();
		if (!isContactKind(kindRaw)) continue;
		const valueRaw = String((item as { value?: unknown }).value ?? '').trim();
		if (!valueRaw) continue;
		const normalized = normalizeContactValue(kindRaw, valueRaw);
		if (typeof normalized !== 'string') continue;
		const labelRaw = (item as { label?: unknown }).label;
		const label =
			typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw.trim() : null;
		contacts.push(label ? { kind: kindRaw, value: normalized, label } : { kind: kindRaw, value: normalized });
	}
	return sortByContactKind(contacts);
}

/** Strict parse for form submit — returns an error string when invalid. */
export function parseContactsForm(
	value: unknown
): ListingContact[] | { error: string } {
	if (value == null || value === '') return [];
	let raw: unknown = value;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return [];
		try {
			raw = JSON.parse(trimmed);
		} catch {
			return { error: 'Invalid contacts data.' };
		}
	}
	if (!Array.isArray(raw)) return { error: 'Invalid contacts data.' };

	const contacts: ListingContact[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const kindRaw = String((item as { kind?: unknown }).kind ?? '').trim();
		const valueRaw = String((item as { value?: unknown }).value ?? '');
		const labelRaw = String((item as { label?: unknown }).label ?? '').trim();

		// Skip blank rows from the form editor.
		if (!valueRaw.trim() && !labelRaw) continue;

		if (!isContactKind(kindRaw)) {
			return { error: 'Each contact must have a valid kind.' };
		}
		const normalized = normalizeContactValue(kindRaw, valueRaw);
		if (typeof normalized !== 'string') return normalized;

		contacts.push(
			labelRaw
				? { kind: kindRaw, value: normalized, label: labelRaw }
				: { kind: kindRaw, value: normalized }
		);
	}
	return sortByContactKind(contacts);
}

export function contactsToJson(contacts: ListingContact[]): Json {
	return contacts.map(c =>
		c.label
			? { kind: c.kind, value: c.value, label: c.label }
			: { kind: c.kind, value: c.value }
	);
}

export function placeAutofillToContacts(opts: {
	phone: string | null | undefined;
	website: string | null | undefined;
}): ListingContact[] {
	const contacts: ListingContact[] = [];
	const phone = opts.phone?.trim();
	if (phone) contacts.push({ kind: 'phone', value: phone });
	const website = opts.website?.trim();
	if (website) {
		contacts.push({ kind: 'website', value: normalizeWebsite(website) });
	}
	return contacts;
}

/**
 * Upsert Places phone/website by kind; preserve email, whatsapp, mobile,
 * and any extra labeled entries.
 */
export function mergeContactsFromAutofill(
	existing: ListingContact[],
	fromPlace: ListingContact[]
): ListingContact[] {
	if (fromPlace.length === 0) return existing;
	if (existing.length === 0) return fromPlace;

	const result = existing.map(c => ({ ...c }));
	for (const incoming of fromPlace) {
		if (!AUTOFILL_KINDS.has(incoming.kind)) continue;
		const idx = result.findIndex(c => c.kind === incoming.kind);
		if (idx >= 0) {
			result[idx] = {
				...result[idx],
				value: incoming.value
			};
		} else {
			result.push({ ...incoming });
		}
	}
	return sortByContactKind(result);
}

export function telHref(value: string): string {
	return `tel:${value.replace(/[^\d+]/g, '')}`;
}

export function whatsappHref(value: string): string {
	const digits = value.replace(/\D/g, '');
	return `https://wa.me/${digits}`;
}

export function websiteHref(url: string): string {
	return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function websiteLabel(url: string): string {
	try {
		return new URL(websiteHref(url)).hostname.replace(/^www\./, '');
	} catch {
		return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
	}
}

export type ContactFormRow = {
	key: string;
	kind: ContactKind;
	label: string;
	value: string;
};

let contactRowSeq = 0;

export function newContactFormRow(
	partial?: Partial<Omit<ContactFormRow, 'key'>>
): ContactFormRow {
	contactRowSeq += 1;
	return {
		key: `contact-${contactRowSeq}-${Date.now()}`,
		kind: partial?.kind ?? 'phone',
		label: partial?.label ?? '',
		value: partial?.value ?? ''
	};
}

export function contactsToFormRows(
	contacts: ListingContact[]
): ContactFormRow[] {
	if (contacts.length === 0) return [];
	return sortByContactKind(contacts).map(c =>
		newContactFormRow({
			kind: c.kind,
			label: c.label ?? '',
			value: c.value
		})
	);
}

export function formRowsToContactsPayload(
	rows: ContactFormRow[]
): ListingContact[] {
	return sortByContactKind(
		rows
			.filter(row => row.value.trim() || row.label.trim())
			.map(row => {
				const label = row.label.trim();
				return label
					? { kind: row.kind, value: row.value.trim(), label }
					: { kind: row.kind, value: row.value.trim() };
			})
	);
}
