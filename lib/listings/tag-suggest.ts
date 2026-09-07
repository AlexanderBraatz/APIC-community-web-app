import {
	dedupeAliases,
	mergeAliasArrays,
	normalizeLabel,
	tagKey,
	type TagRecord
} from '@/lib/listings/tag-resolution';

export type TagSuggestResponse = {
	reuse: string[];
	proposeNew: { name: string; aliases: string[] }[];
	aliasesForExisting: { alias: string; canonical: string }[];
};

export type AliasBackfillResponse = {
	items: { canonical: string; aliases: string[] }[];
};

export type ValidatedTagSuggest = {
	reuse: string[];
	proposeNew: { name: string; aliases: string[] }[];
	aliasesForExisting: { alias: string; canonical: string }[];
	/** Canonical names already accepted that should receive extra aliases on save. */
	pendingAliasMerges: Map<string, string[]>;
};

const MAX_REUSE = 12;
const MAX_PROPOSE_NEW = 6;
const MAX_ALIASES_PER_TAG = 12;
const MAX_ALIAS_BACKFILL_ITEMS = 40;

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === 'string');
}

export function emptyTagSuggestResponse(): TagSuggestResponse {
	return { reuse: [], proposeNew: [], aliasesForExisting: [] };
}

export function validateTagSuggestResponse(
	raw: unknown,
	vocabulary: TagRecord[],
	selectedCanonicals: string[] = []
): ValidatedTagSuggest {
	const data =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

	const nameByKey = new Map(
		vocabulary.map(tag => [tagKey(tag.name), tag.name] as const)
	);
	const selectedKeys = new Set(selectedCanonicals.map(tagKey));

	const reuse: string[] = [];
	const reuseSeen = new Set<string>();
	for (const item of asStringArray(data.reuse).slice(0, MAX_REUSE)) {
		const normalized = normalizeLabel(item);
		if (!normalized) continue;
		const key = tagKey(normalized);
		const canonical = nameByKey.get(key);
		if (!canonical) continue;
		if (reuseSeen.has(key) || selectedKeys.has(key)) continue;
		reuseSeen.add(key);
		reuse.push(canonical);
	}

	const proposeNew: { name: string; aliases: string[] }[] = [];
	const proposeSeen = new Set<string>();
	const proposeRaw = Array.isArray(data.proposeNew) ? data.proposeNew : [];
	for (const entry of proposeRaw.slice(0, MAX_PROPOSE_NEW)) {
		if (!entry || typeof entry !== 'object') continue;
		const row = entry as Record<string, unknown>;
		const name = normalizeLabel(String(row.name ?? ''));
		if (!name || name.length > 100) continue;
		const key = tagKey(name);
		if (nameByKey.has(key) || proposeSeen.has(key) || selectedKeys.has(key)) {
			continue;
		}
		proposeSeen.add(key);
		proposeNew.push({
			name,
			aliases: dedupeAliases(asStringArray(row.aliases))
				.filter(alias => tagKey(alias) !== key)
				.slice(0, MAX_ALIASES_PER_TAG)
		});
	}

	const aliasesForExisting: { alias: string; canonical: string }[] = [];
	const pendingAliasMerges = new Map<string, string[]>();

	const aliasRaw = Array.isArray(data.aliasesForExisting)
		? data.aliasesForExisting
		: [];
	for (const entry of aliasRaw) {
		if (!entry || typeof entry !== 'object') continue;
		const row = entry as Record<string, unknown>;
		const alias = normalizeLabel(String(row.alias ?? ''));
		const canonicalRaw = normalizeLabel(String(row.canonical ?? ''));
		if (!alias || !canonicalRaw) continue;
		const canonical = nameByKey.get(tagKey(canonicalRaw));
		if (!canonical) continue;
		if (tagKey(alias) === tagKey(canonical)) continue;
		aliasesForExisting.push({ alias, canonical });
		const prev = pendingAliasMerges.get(canonical) ?? [];
		pendingAliasMerges.set(
			canonical,
			mergeAliasArrays(prev, [alias], canonical)
		);
	}

	for (const proposed of proposeNew) {
		if (proposed.aliases.length) {
			pendingAliasMerges.set(proposed.name, proposed.aliases);
		}
	}

	return { reuse, proposeNew, aliasesForExisting, pendingAliasMerges };
}

export function validateAliasBackfillResponse(
	raw: unknown,
	requestedCanonicals: string[]
): AliasBackfillResponse {
	const allowed = new Set(requestedCanonicals.map(tagKey));
	const nameByKey = new Map(
		requestedCanonicals.map(name => [tagKey(name), name] as const)
	);
	const data =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const itemsRaw = Array.isArray(data.items) ? data.items : [];
	const items: { canonical: string; aliases: string[] }[] = [];
	const seen = new Set<string>();

	for (const entry of itemsRaw.slice(0, MAX_ALIAS_BACKFILL_ITEMS)) {
		if (!entry || typeof entry !== 'object') continue;
		const row = entry as Record<string, unknown>;
		const canonicalRaw = normalizeLabel(String(row.canonical ?? ''));
		if (!canonicalRaw) continue;
		const key = tagKey(canonicalRaw);
		if (!allowed.has(key) || seen.has(key)) continue;
		const canonical = nameByKey.get(key)!;
		seen.add(key);
		items.push({
			canonical,
			aliases: dedupeAliases(asStringArray(row.aliases))
				.filter(alias => tagKey(alias) !== key)
				.slice(0, MAX_ALIASES_PER_TAG)
		});
	}

	return { items };
}

export function serializeVocabularyForPrompt(
	tags: TagRecord[],
	limit = 400
): { name: string; aliases: string[] }[] {
	return tags.slice(0, limit).map(tag => ({
		name: tag.name,
		aliases: (tag.aliases ?? []).slice(0, 8)
	}));
}

export function pendingMergesToArray(
	merges: Map<string, string[]>
): { canonical: string; aliases: string[] }[] {
	return [...merges.entries()].map(([canonical, aliases]) => ({
		canonical,
		aliases
	}));
}

export function arrayToPendingMerges(
	items: { canonical: string; aliases: string[] }[]
): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const item of items) {
		const name = normalizeLabel(item.canonical);
		if (!name) continue;
		map.set(name, mergeAliasArrays([], item.aliases, name));
	}
	return map;
}
