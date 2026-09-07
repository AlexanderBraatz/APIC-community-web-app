import type { SupabaseClient } from '@supabase/supabase-js';
import {
	mergeAliasArrays,
	normalizeLabel,
	tagKey
} from '@/lib/listings/tag-resolution';
import type { Database } from '@/lib/supabase/database.types';

type AdminSupabase = SupabaseClient<Database>;

export async function mergeAliasesIntoTags(
	supabase: AdminSupabase,
	merges: Map<string, string[]>
): Promise<number> {
	if (merges.size === 0) return 0;

	const { data, error } = await supabase
		.from('listing_tags')
		.select('id, name, aliases');
	if (error) throw new Error(error.message);

	let updated = 0;
	for (const row of data ?? []) {
		let extras: string[] | undefined =
			merges.get(row.name) ?? merges.get(normalizeLabel(row.name));
		if (!extras) {
			for (const [canonical, aliases] of merges) {
				if (tagKey(canonical) === tagKey(row.name)) {
					extras = aliases;
					break;
				}
			}
		}
		if (!extras?.length) continue;

		const next = mergeAliasArrays(
			Array.isArray(row.aliases) ? row.aliases : [],
			extras,
			row.name
		);
		const prev = Array.isArray(row.aliases) ? row.aliases : [];
		if (
			next.length === prev.length &&
			next.every((a, i) => tagKey(a) === tagKey(prev[i] ?? ''))
		) {
			continue;
		}

		const { error: updateError } = await supabase
			.from('listing_tags')
			.update({ aliases: next })
			.eq('id', row.id);
		if (updateError) throw new Error(updateError.message);
		updated += 1;
	}
	return updated;
}
