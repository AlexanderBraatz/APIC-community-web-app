export type TagRecord = {
	id: string;
	name: string;
	aliases: string[];
};

export type ResolveTagResult =
	| { status: 'invalid'; raw: string; reason: string }
	| { status: 'matched'; raw: string; tag: TagRecord }
	| { status: 'unresolved'; raw: string; normalized: string };

const MAX_TAG_LENGTH = 100;

/** Trim and collapse internal whitespace. */
export function normalizeLabel(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

export function tagKey(value: string): string {
	return normalizeLabel(value).toLowerCase();
}

/** Case-insensitive dedupe within one tag’s aliases array. */
export function dedupeAliases(aliases: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const alias of aliases) {
		const normalized = normalizeLabel(alias);
		if (!normalized || normalized.length > MAX_TAG_LENGTH) continue;
		const key = normalized.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(normalized);
	}
	return out;
}

export function mergeAliasArrays(
	existing: string[],
	incoming: string[],
	canonicalName?: string
): string[] {
	const canonicalKey = canonicalName ? tagKey(canonicalName) : null;
	const merged = dedupeAliases([...existing, ...incoming]).filter(
		alias => !canonicalKey || tagKey(alias) !== canonicalKey
	);
	return merged;
}

/**
 * Resolve raw inputs to existing tags (name first, then aliases) or unresolved.
 * Ambiguous alias matches pick the first tag by name order.
 */
export function resolveTagInputs(
	rawInputs: string[],
	tags: TagRecord[]
): ResolveTagResult[] {
	const byName = new Map<string, TagRecord>();
	const byAlias = new Map<string, TagRecord[]>();

	const sorted = [...tags].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
	);

	for (const tag of sorted) {
		byName.set(tagKey(tag.name), tag);
		for (const alias of tag.aliases ?? []) {
			const key = tagKey(alias);
			if (!key) continue;
			const list = byAlias.get(key) ?? [];
			list.push(tag);
			byAlias.set(key, list);
		}
	}

	const results: ResolveTagResult[] = [];
	const seenCanonical = new Set<string>();

	for (const raw of rawInputs) {
		const normalized = normalizeLabel(raw);
		if (!normalized) {
			results.push({ status: 'invalid', raw, reason: 'empty' });
			continue;
		}
		if (normalized.length > MAX_TAG_LENGTH) {
			results.push({
				status: 'invalid',
				raw,
				reason: `longer than ${MAX_TAG_LENGTH} characters`
			});
			continue;
		}

		const key = normalized.toLowerCase();
		const byCanonical = byName.get(key);
		if (byCanonical) {
			if (seenCanonical.has(byCanonical.id)) continue;
			seenCanonical.add(byCanonical.id);
			results.push({ status: 'matched', raw, tag: byCanonical });
			continue;
		}

		const aliasMatches = byAlias.get(key);
		if (aliasMatches?.length) {
			const tag = aliasMatches[0];
			if (seenCanonical.has(tag.id)) continue;
			seenCanonical.add(tag.id);
			results.push({ status: 'matched', raw, tag });
			continue;
		}

		results.push({ status: 'unresolved', raw, normalized });
	}

	return results;
}

/** All existing tags whose name or aliases fuzzy-match the query key. */
export function tagsMatchingQueryKey(
	query: string,
	tags: TagRecord[]
): TagRecord[] {
	const key = tagKey(query);
	if (!key) return [];
	const matches: TagRecord[] = [];
	const seen = new Set<string>();
	for (const tag of tags) {
		if (seen.has(tag.id)) continue;
		if (tagKey(tag.name) === key) {
			seen.add(tag.id);
			matches.push(tag);
			continue;
		}
		if ((tag.aliases ?? []).some(alias => tagKey(alias) === key)) {
			seen.add(tag.id);
			matches.push(tag);
		}
	}
	return matches;
}

export function buildAliasMap(
	tags: { name: string; aliases: string[] }[]
): Map<string, string[]> {
	/** aliasKey → canonical names (may be multiple when aliases overlap). */
	const map = new Map<string, string[]>();
	for (const tag of tags) {
		const canonical = tag.name;
		for (const alias of tag.aliases ?? []) {
			const key = tagKey(alias);
			if (!key) continue;
			const list = map.get(key) ?? [];
			if (!list.some(n => tagKey(n) === tagKey(canonical))) {
				list.push(canonical);
			}
			map.set(key, list);
		}
	}
	return map;
}

export function canonicalsForAliasQuery(
	query: string,
	aliasMap: Map<string, string[]>
): string[] {
	return aliasMap.get(tagKey(query)) ?? [];
}
