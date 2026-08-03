import type { CategorySlug, Listing } from '@/lib/listings-search';
import { createClient } from '@/lib/supabase/client';

type ListingRow = {
	id: string;
	name: string;
	type: string | null;
	address: string | null;
	contact: string | null;
	remark: string | null;
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
		contact: row.contact,
		remark: row.remark,
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
			contact,
			remark,
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
