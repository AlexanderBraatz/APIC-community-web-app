'use client';

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
	type KeyboardEvent
} from 'react';
import { RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { suggestListingTags } from '@/lib/listings/tag-suggest-actions';
import { mapPlacesTypesToTagNames } from '@/lib/listings/places-type-tags';
import { fuzzyScore, normalize } from '@/lib/listings-search';
import { tagKey, type TagRecord } from '@/lib/listings/tag-resolution';
import type { CategorySlug } from '@/lib/listings-search';
import type { KnownTag } from '@/lib/listings/types';

export type SelectedTagChip = {
	name: string;
	isNew: boolean;
};

const EXISTING_CHIP_CLASS = 'border-amber-300 bg-amber-50 text-amber-950';
const NEW_CHIP_CLASS = 'border-emerald-300 bg-emerald-50 text-emerald-900';

type ListingTagsEditorProps = {
	knownTags: KnownTag[];
	selected: SelectedTagChip[];
	onChange: (next: SelectedTagChip[]) => void;
	pendingAliasMerges: { canonical: string; aliases: string[] }[];
	onPendingAliasMergesChange: (
		next: { canonical: string; aliases: string[] }[]
	) => void;
	category: CategorySlug;
	name: string;
	type: string;
	address: string;
	notes: string;
	placesPrimaryType: string | null;
	placesTypes: string[];
};

function mergePendingAliases(
	current: { canonical: string; aliases: string[] }[],
	incoming: { canonical: string; aliases: string[] }[]
) {
	const merged = [...current];
	for (const item of incoming) {
		const idx = merged.findIndex(
			row => tagKey(row.canonical) === tagKey(item.canonical)
		);
		if (idx >= 0) {
			merged[idx] = {
				canonical: merged[idx].canonical,
				aliases: [...new Set([...merged[idx].aliases, ...item.aliases])]
			};
		} else {
			merged.push(item);
		}
	}
	return merged;
}

export default function ListingTagsEditor({
	knownTags,
	selected,
	onChange,
	pendingAliasMerges,
	onPendingAliasMergesChange,
	category,
	name,
	type,
	address,
	notes,
	placesPrimaryType,
	placesTypes
}: ListingTagsEditorProps) {
	const [search, setSearch] = useState('');
	const [removeCandidate, setRemoveCandidate] = useState<string | null>(null);
	const [suggestPending, startSuggest] = useTransition();
	const [suggestError, setSuggestError] = useState<string | null>(null);
	const [suggestAttempted, setSuggestAttempted] = useState(false);
	const hasAutoSuggested = useRef(false);

	const vocabulary: TagRecord[] = useMemo(
		() =>
			knownTags.map(tag => ({
				id: tag.id,
				name: tag.name,
				aliases: tag.aliases
			})),
		[knownTags]
	);

	const selectedKeys = useMemo(
		() => new Set(selected.map(tag => tagKey(tag.name))),
		[selected]
	);

	const searchHits = useMemo(() => {
		const q = normalize(search);
		if (!q) return [] as string[];
		return vocabulary
			.filter(tag => !selectedKeys.has(tagKey(tag.name)))
			.map(tag => {
				const nameScore = fuzzyScore(search, tag.name);
				const aliasScore = Math.max(
					0,
					...tag.aliases.map(alias => fuzzyScore(search, alias) * 0.9)
				);
				return { name: tag.name, score: Math.max(nameScore, aliasScore) };
			})
			.filter(item => item.score > 0)
			.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
			.slice(0, 8)
			.map(item => item.name);
	}, [search, vocabulary, selectedKeys]);

	const typedTag = search.trim().replace(/\s+/g, ' ');
	const exactVocabularyMatch = useMemo(() => {
		if (!typedTag) return null;
		const key = tagKey(typedTag);
		const byName = vocabulary.find(tag => tagKey(tag.name) === key);
		if (byName) return byName.name;
		const byAlias = vocabulary.find(tag =>
			tag.aliases.some(alias => tagKey(alias) === key)
		);
		return byAlias?.name ?? null;
	}, [typedTag, vocabulary]);

	const showCreateChip =
		Boolean(typedTag) &&
		!exactVocabularyMatch &&
		!selectedKeys.has(tagKey(typedTag));

	const deterministicHints = useMemo(
		() =>
			mapPlacesTypesToTagNames({
				types: placesTypes,
				primaryType: placesPrimaryType,
				category
			}),
		[placesTypes, placesPrimaryType, category]
	);

	function addCanonical(nameValue: string, isNew = false) {
		const normalized = nameValue.trim().replace(/\s+/g, ' ');
		if (!normalized) return;
		if (selectedKeys.has(tagKey(normalized))) return;
		const existing = vocabulary.find(
			tag => tagKey(tag.name) === tagKey(normalized)
		);
		onChange([
			...selected,
			{
				name: existing?.name ?? normalized,
				isNew: existing ? false : isNew
			}
		]);
		setSearch('');
	}

	function confirmRemove() {
		if (!removeCandidate) return;
		onChange(
			selected.filter(tag => tagKey(tag.name) !== tagKey(removeCandidate))
		);
		setRemoveCandidate(null);
	}

	function applySuggestions(
		reuse: string[],
		proposeNew: { name: string; aliases: string[] }[],
		aliasMerges: { canonical: string; aliases: string[] }[] = []
	) {
		const next: SelectedTagChip[] = [...selected];
		const keys = new Set(selectedKeys);

		for (const tagName of reuse) {
			const key = tagKey(tagName);
			if (keys.has(key)) continue;
			const existing = vocabulary.find(tag => tagKey(tag.name) === key);
			next.push({
				name: existing?.name ?? tagName.trim().replace(/\s+/g, ' '),
				isNew: false
			});
			keys.add(key);
		}

		for (const item of proposeNew) {
			const key = tagKey(item.name);
			if (keys.has(key)) continue;
			const existing = vocabulary.find(tag => tagKey(tag.name) === key);
			next.push({
				name: existing?.name ?? item.name.trim().replace(/\s+/g, ' '),
				isNew: existing ? false : true
			});
			keys.add(key);
		}

		onChange(next);

		const fromPropose = proposeNew
			.filter(item => item.aliases.length > 0)
			.map(item => ({
				canonical:
					vocabulary.find(tag => tagKey(tag.name) === tagKey(item.name))
						?.name ?? item.name.trim().replace(/\s+/g, ' '),
				aliases: item.aliases
			}));
		const combinedAliases = [...aliasMerges, ...fromPropose];
		if (combinedAliases.length) {
			onPendingAliasMergesChange(
				mergePendingAliases(pendingAliasMerges, combinedAliases)
			);
		}
	}

	function runSuggest() {
		startSuggest(async () => {
			setSuggestAttempted(true);
			setSuggestError(null);
			const result = await suggestListingTags({
				name,
				type: type || null,
				address: address || null,
				notes: notes || null,
				category,
				placesPrimaryType,
				placesTypes,
				selectedTags: selected.map(tag => tag.name)
			});
			if (!result.ok) {
				setSuggestError(result.error);
				applySuggestions(
					deterministicHints.filter(hint => !selectedKeys.has(tagKey(hint))),
					[]
				);
				return;
			}
			applySuggestions(
				result.suggest.reuse,
				result.suggest.proposeNew,
				result.pendingAliasMerges
			);
		});
	}

	useEffect(() => {
		if (hasAutoSuggested.current) return;
		if (selected.length > 0) {
			hasAutoSuggested.current = true;
			return;
		}
		hasAutoSuggested.current = true;
		runSuggest();
		// Only auto-run once on mount when empty.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only auto-suggest
	}, []);

	function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		if (showCreateChip) {
			addCanonical(typedTag, true);
			return;
		}
		if (
			exactVocabularyMatch &&
			!selectedKeys.has(tagKey(exactVocabularyMatch))
		) {
			addCanonical(exactVocabularyMatch, false);
			return;
		}
		if (searchHits[0]) {
			addCanonical(searchHits[0], false);
		}
	}

	const showEmptyAfterSuggest =
		!suggestPending &&
		suggestAttempted &&
		selected.length === 0 &&
		!suggestError;

	const showRetry = suggestAttempted;

	return (
		<div className="space-y-4 sm:col-span-2">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#666]">
				<span className="inline-flex items-center gap-1.5">
					<span
						className="size-2 shrink-0 rounded-full bg-amber-400"
						aria-hidden
					/>
					Existing keyword
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span
						className="size-2 shrink-0 rounded-full bg-emerald-500"
						aria-hidden
					/>
					New keyword (created on save)
				</span>
			</div>

			{suggestPending ? (
				<div
					className="space-y-3"
					role="status"
					aria-live="polite"
				>
					<p className="text-xs text-[#666]">
						Matching this listing against known keywords and Places data, then
						asking AI for the best existing keywords — or new ones when needed…
					</p>
					<div className="flex flex-wrap gap-2">
						{[0, 1, 2].map(i => (
							<span
								key={i}
								className="h-7 w-16 animate-pulse rounded-[2px] bg-amber-100/80"
								style={{ animationDelay: `${i * 120}ms` }}
							/>
						))}
						<span className="h-7 w-20 animate-pulse rounded-[2px] bg-emerald-100/80" />
					</div>
				</div>
			) : selected.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{selected.map(tag => (
						<span
							key={tag.name}
							className={`inline-flex items-center gap-1 border px-2 py-1 text-xs ${
								tag.isNew ? NEW_CHIP_CLASS : EXISTING_CHIP_CLASS
							}`}
						>
							{tag.name}
							<button
								type="button"
								aria-label={`Remove ${tag.name}`}
								className="ml-0.5 text-[#666] hover:text-[#222]"
								onClick={() => setRemoveCandidate(tag.name)}
							>
								<X className="size-3.5" />
							</button>
						</span>
					))}
				</div>
			) : showEmptyAfterSuggest ? (
				<p className="text-xs text-[#999]">
					No strong matches found. Type below to add keywords.
				</p>
			) : (
				<p className="text-xs text-[#999]">No keywords selected yet.</p>
			)}

			{suggestError ? (
				<p
					className="text-xs text-amber-800"
					role="status"
				>
					{suggestError} Applied Places-based hints when available.
				</p>
			) : null}

			{showRetry ? (
				<Button
					type="button"
					onClick={runSuggest}
					loading={suggestPending}
					variant="secondary"
				>
					{suggestError || selected.length === 0
						? 'Try again'
						: 'Suggest again'}
					<RotateCcw className="size-4" aria-hidden />
				</Button>
			) : null}

			<div className="space-y-2">
				<Label htmlFor="tag_search">Add a keyword</Label>
				<Input
					id="tag_search"
					value={search}
					onChange={e => setSearch(e.target.value)}
					onKeyDown={handleSearchKeyDown}
					placeholder="Match name or alias, or type a new keyword…"
					disabled={suggestPending}
				/>
				{typedTag ? (
					<div className="flex flex-wrap gap-2">
						{showCreateChip ? (
							<button
								type="button"
								onClick={() => addCanonical(typedTag, true)}
								className={`border px-2 py-1 text-xs hover:opacity-90 ${NEW_CHIP_CLASS}`}
							>
								+ {typedTag}
							</button>
						) : null}
						{exactVocabularyMatch &&
						!selectedKeys.has(tagKey(exactVocabularyMatch)) &&
						!searchHits.includes(exactVocabularyMatch) ? (
							<button
								type="button"
								onClick={() => addCanonical(exactVocabularyMatch, false)}
								className={`border px-2 py-1 text-xs hover:opacity-90 ${EXISTING_CHIP_CLASS}`}
							>
								+ {exactVocabularyMatch}
							</button>
						) : null}
						{searchHits.map(tag => (
							<button
								key={tag}
								type="button"
								onClick={() => addCanonical(tag)}
								className={`border px-2 py-1 text-xs hover:opacity-90 ${EXISTING_CHIP_CLASS}`}
							>
								+ {tag}
							</button>
						))}
					</div>
				) : null}
			</div>

			<input
				type="hidden"
				name="tags"
				value={selected.map(tag => tag.name).join(', ')}
			/>

			<Dialog
				open={removeCandidate !== null}
				onOpenChange={open => {
					if (!open) setRemoveCandidate(null);
				}}
			>
				<DialogContent
					className="sm:max-w-md"
					showCloseButton={false}
				>
					<DialogHeader>
						<DialogTitle>Remove keyword?</DialogTitle>
						<DialogDescription>
							Remove “{removeCandidate}” from this listing? You can add it again
							later.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setRemoveCandidate(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={confirmRemove}
						>
							Remove
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
