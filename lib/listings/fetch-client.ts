import type { CategorySlug, Listing } from '@/lib/listings-search';
import { parseContacts } from '@/lib/listings/contacts';
import { parseOpeningHours } from '@/lib/listings/opening-hours';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';

type ListingRow = {
	id: string;
	name: string;
	type: string | null;
	address: string | null;
	contacts: Json;
	notes: string | null;
	opening_hours: Json | null;
	category: CategorySlug;
	source_url: string | null;
	latitude: number | null;
	longitude: number | null;
	listing_tag_assignments:
		| {
				listing_tags: { name: string } | { name: string }[] | null;
		  }[]
		| null;
};

function tagsFromAssignments(
	assignments: ListingRow['listing_tag_assignments']
): string[] {
	if (!assignments?.length) return [];

	const tags: string[] = [];
	const seen = new Set<string>();

	for (const assignment of assignments) {
		const raw = assignment.listing_tags;
		const tagRows = Array.isArray(raw) ? raw : raw ? [raw] : [];
		for (const tag of tagRows) {
			const name = tag.name?.trim();
			if (!name) continue;
			const key = name.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			tags.push(name);
		}
	}

	return tags;
}

export function mapListingRow(row: ListingRow): Listing {
	return {
		name: row.name,
		type: row.type,
		address: row.address,
		contacts: parseContacts(row.contacts),
		notes: row.notes,
		openingHours: parseOpeningHours(row.opening_hours),
		category: row.category,
		sourceUrl: row.source_url ?? '',
		tags: tagsFromAssignments(row.listing_tag_assignments),
		lat: row.latitude,
		lng: row.longitude
	};
}

export async function fetchListingsForCategory(
	category: CategorySlug | null
): Promise<Listing[]> {
	const supabase = createClient();
	let query = supabase
		.from('listings')
		.select(
			`
			id,
			name,
			type,
			address,
			contacts,
			notes,
			opening_hours,
			category,
			source_url,
			latitude,
			longitude,
			listing_tag_assignments (
				listing_tags ( name )
			)
		`
		)
		.order('name', { ascending: true });

	if (category) {
		query = query.eq('category', category);
	}

	const { data, error } = await query;
	if (error) {
		throw new Error(error.message);
	}

	return ((data ?? []) as ListingRow[]).map(mapListingRow);
}

/** Alias key → canonical tag names (aliases never rendered as chips). */
export async function fetchTagAliasMap(): Promise<Map<string, string[]>> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from('listing_tags')
		.select('name, aliases');
	if (error) {
		throw new Error(error.message);
	}

	const map = new Map<string, string[]>();
	for (const row of data ?? []) {
		const aliases = Array.isArray(row.aliases) ? row.aliases : [];
		for (const alias of aliases) {
			const key = alias
				.trim()
				.replace(/\s+/g, ' ')
				.toLowerCase();
			if (!key) continue;
			const list = map.get(key) ?? [];
			if (!list.some(n => n.toLowerCase() === row.name.toLowerCase())) {
				list.push(row.name);
			}
			map.set(key, list);
		}
	}
	return map;
}
