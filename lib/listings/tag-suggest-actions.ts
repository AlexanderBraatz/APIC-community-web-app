'use server';

import OpenAI from 'openai';
import { requireAdmin } from '@/lib/admin/require-admin';
import { limitTagSuggest } from '@/lib/admin/rate-limit';
import { isCategorySlug } from '@/lib/listings/types';
import { mapPlacesTypesToTagNames } from '@/lib/listings/places-type-tags';
import { mergeAliasesIntoTags } from '@/lib/listings/tag-alias-persist';
import {
	emptyTagSuggestResponse,
	pendingMergesToArray,
	serializeVocabularyForPrompt,
	validateAliasBackfillResponse,
	validateTagSuggestResponse,
	type AliasBackfillResponse,
	type TagSuggestResponse
} from '@/lib/listings/tag-suggest';
import {
	normalizeLabel,
	tagKey,
	type TagRecord
} from '@/lib/listings/tag-resolution';
import type { CategorySlug } from '@/lib/listings-search';
import type { Json } from '@/lib/supabase/database.types';

const OPENAI_MODEL = 'gpt-4o-mini';

function openaiClient() {
	const key = process.env.OPENAI_API_KEY?.trim();
	if (!key) return null;
	return new OpenAI({ apiKey: key });
}

async function loadVocabulary(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase']
): Promise<TagRecord[]> {
	const { data, error } = await supabase
		.from('listing_tags')
		.select('id, name, aliases')
		.order('name', { ascending: true });
	if (error) throw new Error(error.message);
	return (data ?? []).map(row => ({
		id: row.id,
		name: row.name,
		aliases: Array.isArray(row.aliases) ? row.aliases : []
	}));
}

async function writeTagAudit(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	payload: {
		action: string;
		targetId: string;
		summary: string;
		oldValues?: Record<string, unknown> | null;
		newValues?: Record<string, unknown> | null;
	}
) {
	const { error } = await supabase.rpc('write_admin_audit', {
		p_action: payload.action,
		p_target_type: 'tag',
		p_target_id: payload.targetId,
		p_summary: payload.summary,
		p_old_values: (payload.oldValues ?? null) as Json | null,
		p_new_values: (payload.newValues ?? null) as Json | null
	});
	if (error) throw new Error(error.message);
}

export type SuggestListingTagsInput = {
	name: string;
	type: string | null;
	address: string | null;
	notes: string | null;
	category: string;
	placesPrimaryType: string | null;
	placesTypes: string[];
	selectedTags: string[];
};

export type SuggestListingTagsResult =
	| {
			ok: true;
			deterministic: string[];
			suggest: TagSuggestResponse;
			pendingAliasMerges: { canonical: string; aliases: string[] }[];
			aiUsed: boolean;
	  }
	| { ok: false; error: string };

export async function suggestListingTags(
	input: SuggestListingTagsInput
): Promise<SuggestListingTagsResult> {
	try {
		const { supabase, user } = await requireAdmin();
		const rate = limitTagSuggest(user.id);
		if (!rate.ok) return { ok: false, error: rate.error };

		const category = isCategorySlug(input.category)
			? (input.category as CategorySlug)
			: null;

		const vocabulary = await loadVocabulary(supabase);
		const deterministic = mapPlacesTypesToTagNames({
			types: input.placesTypes ?? [],
			primaryType: input.placesPrimaryType,
			category
		});

		// Resolve deterministic through vocab so we return canonical names.
		const detCanonical: string[] = [];
		const detSeen = new Set(input.selectedTags.map(tagKey));
		for (const name of deterministic) {
			const match = vocabulary.find(t => tagKey(t.name) === tagKey(name));
			const canonical = match?.name ?? name;
			if (detSeen.has(tagKey(canonical))) continue;
			detSeen.add(tagKey(canonical));
			detCanonical.push(canonical);
		}

		const client = openaiClient();
		if (!client) {
			const validated = validateTagSuggestResponse(
				{ reuse: detCanonical, proposeNew: [], aliasesForExisting: [] },
				vocabulary,
				input.selectedTags
			);
			return {
				ok: true,
				deterministic: detCanonical,
				suggest: {
					reuse: validated.reuse,
					proposeNew: validated.proposeNew,
					aliasesForExisting: validated.aliasesForExisting
				},
				pendingAliasMerges: pendingMergesToArray(validated.pendingAliasMerges),
				aiUsed: false
			};
		}

		const vocabPayload = serializeVocabularyForPrompt(vocabulary);
		const completion = await client.chat.completions.create({
			model: OPENAI_MODEL,
			temperature: 0.5,
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content: `You suggest listing tags for guests staying in the Castelfalfi holiday community (Tuscany).
Tags help members filter by what a place offers or is known for: cuisine, diet, products for sale, services/treatments, languages spoken, family-friendliness, outdoors, and practical needs.

ALWAYS read listing.notes (APIC description). Pull concrete, searchable attributes from what guests can eat, buy, do, or experience — even when Places data is only generic (e.g. store, spa, restaurant).
From notes, extract offering types and specialties, for example:
- Products: gifts, souvenirs, local crafts, wine, olive oil, ceramics, fashion, books
- Care / wellness: creams, skincare, beauty treatments, massage, spa
- Food traits: vegan, vegetarian, gluten-free, pizza, gelato
- Languages: German-speaking, English-speaking, etc.
Turn those into short filter tags (reuse vocabulary when the same idea already exists; otherwise proposeNew).

Important distinctions:
- vegan is NOT the same as vegetarian — if notes say vegan, put "vegan" in proposeNew (unless it already exists in vocabulary).
- Language cues ("speak German", "English spoken") → proposeNew like "German-speaking", "English-speaking".
- Prefer specific guest-facing labels ("gifts", "skincare") over vague ones ("shopping", "nice shop").

Reuse vocabulary when name/aliases already match that exact idea. Still add proposeNew for distinct guest-facing attributes missing from vocabulary.
Skip vague fluff ("great place", "best", "nice owner"). Do not invent unsupported attributes.
Do not rediscover deterministicHints or selectedTags.

Example A — notes "vegan food and speak german with the owner" plus Places restaurant:
{"reuse":["restaurant","vegetarian"],"proposeNew":[{"name":"vegan","aliases":["vegan food"]},{"name":"German-speaking","aliases":["speaks German","Deutsch"]}],"aliasesForExisting":[]}

Example B — notes mention creams/treatments and Tuscany-themed gifts (Places may be store/beauty):
{"reuse":["beauty"],"proposeNew":[{"name":"gifts","aliases":["souvenirs","gift shop","Tuscany gifts"]},{"name":"skincare","aliases":["creams","treatments","cosmetics"]}],"aliasesForExisting":[]}
(Reuse beauty/shop tags only if they exist in vocabulary; still propose gifts and skincare-style tags when notes support them and vocabulary lacks them.)

Return JSON: {"reuse":string[],"proposeNew":[{"name":string,"aliases":string[]}],"aliasesForExisting":[{"alias":string,"canonical":string}]}
reuse/proposeNew names must be short English or Italian labels (max 100 chars).`
				},
				{
					role: 'user',
					content: JSON.stringify({
						listing: {
							name: input.name,
							type: input.type,
							address: input.address,
							notes: input.notes,
							category: input.category
						},
						places: {
							primaryType: input.placesPrimaryType,
							types: input.placesTypes
						},
						deterministicHints: detCanonical,
						selectedTags: input.selectedTags,
						vocabulary: vocabPayload
					})
				}
			]
		});

		const text = completion.choices[0]?.message?.content ?? '{}';
		let parsed: unknown = emptyTagSuggestResponse();
		try {
			parsed = JSON.parse(text);
		} catch {
			parsed = emptyTagSuggestResponse();
		}

		const validated = validateTagSuggestResponse(
			parsed,
			vocabulary,
			input.selectedTags
		);

		// Ensure deterministic reuses are present even if the model omitted them.
		const reuse = [...validated.reuse];
		const reuseKeys = new Set(reuse.map(tagKey));
		for (const name of detCanonical) {
			if (reuseKeys.has(tagKey(name))) continue;
			reuse.push(name);
			reuseKeys.add(tagKey(name));
		}

		return {
			ok: true,
			deterministic: detCanonical,
			suggest: {
				reuse,
				proposeNew: validated.proposeNew,
				aliasesForExisting: validated.aliasesForExisting
			},
			pendingAliasMerges: pendingMergesToArray(validated.pendingAliasMerges),
			aiUsed: true
		};
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error ? error.message : 'Tag suggestion failed.'
		};
	}
}

export async function generateAliasesForTags(
	canonicalNames: string[]
): Promise<
	| { ok: true; items: AliasBackfillResponse['items']; updated: number }
	| { ok: false; error: string }
> {
	try {
		const { supabase, user } = await requireAdmin();
		const rate = limitTagSuggest(user.id);
		if (!rate.ok) return { ok: false, error: rate.error };

		const names = [
			...new Map(
				canonicalNames
					.map(normalizeLabel)
					.filter(Boolean)
					.map(n => [tagKey(n), n] as const)
			).values()
		];
		if (names.length === 0) {
			return { ok: true, items: [], updated: 0 };
		}

		const client = openaiClient();
		if (!client) {
			return { ok: false, error: 'Missing OPENAI_API_KEY.' };
		}

		const completion = await client.chat.completions.create({
			model: OPENAI_MODEL,
			temperature: 0.2,
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content: `Generate short search aliases (synonyms, misspellings, Italian/English alternates) for listing tags.
Return JSON: {"items":[{"canonical":string,"aliases":string[]}]}
Only include the requested canonical names. Do not repeat the canonical as an alias. Max 8 aliases each.`
				},
				{
					role: 'user',
					content: JSON.stringify({ tags: names })
				}
			]
		});

		const text = completion.choices[0]?.message?.content ?? '{}';
		let parsed: unknown = { items: [] };
		try {
			parsed = JSON.parse(text);
		} catch {
			parsed = { items: [] };
		}

		const validated = validateAliasBackfillResponse(parsed, names);
		const merges = new Map<string, string[]>();
		for (const item of validated.items) {
			merges.set(item.canonical, item.aliases);
		}
		const updated = await mergeAliasesIntoTags(supabase, merges);

		if (updated > 0) {
			await writeTagAudit(supabase, {
				action: 'tag.aliases_backfill',
				targetId: 'batch',
				summary: `Filled aliases for ${updated} tag(s)`,
				newValues: { items: validated.items }
			});
		}

		return { ok: true, items: validated.items, updated };
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error
					? error.message
					: 'Alias generation failed.'
		};
	}
}

/** Non-fatal: generate aliases for newly created tags still empty. */
export async function backfillEmptyAliasesForNames(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	canonicalNames: string[]
): Promise<void> {
	if (!canonicalNames.length) return;
	if (!process.env.OPENAI_API_KEY?.trim()) return;

	const { data, error } = await supabase
		.from('listing_tags')
		.select('id, name, aliases')
		.in('name', canonicalNames);
	if (error) return;

	const empty = (data ?? [])
		.filter(row => !Array.isArray(row.aliases) || row.aliases.length === 0)
		.map(row => row.name);
	if (!empty.length) return;

	await generateAliasesForTags(empty);
}
