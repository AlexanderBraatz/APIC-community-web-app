'use client';

import { useMemo, useState, useTransition } from 'react';
import { X } from 'lucide-react';
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
	const [addNew, setAddNew] = useState('');
	const [removeCandidate, setRemoveCandidate] = useState<string | null>(null);
	const [suggestPending, startSuggest] = useTransition();
	const [suggestError, setSuggestError] = useState<string | null>(null);
	const [tray, setTray] = useState<{
		reuse: string[];
		proposeNew: { name: string; aliases: string[] }[];
	} | null>(null);

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
		const existing = vocabulary.find(tag => tagKey(tag.name) === tagKey(normalized));
		onChange([
			...selected,
			{
				name: existing?.name ?? normalized,
				isNew: existing ? false : isNew
			}
		]);
		setSearch('');
		setAddNew('');
	}

	function confirmRemove() {
		if (!removeCandidate) return;
		onChange(
			selected.filter(tag => tagKey(tag.name) !== tagKey(removeCandidate))
		);
		setRemoveCandidate(null);
	}

	function acceptSuggestion(nameValue: string, isNew: boolean, aliases: string[] = []) {
		addCanonical(nameValue, isNew);
		if (aliases.length) {
			const canonical =
				vocabulary.find(tag => tagKey(tag.name) === tagKey(nameValue))?.name ??
				nameValue.trim().replace(/\s+/g, ' ');
			const without = pendingAliasMerges.filter(
				item => tagKey(item.canonical) !== tagKey(canonical)
			);
			onPendingAliasMergesChange([
				...without,
				{ canonical, aliases }
			]);
		}
	}

	function runSuggest() {
		startSuggest(async () => {
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
				setTray({
					reuse: deterministicHints.filter(
						hint => !selectedKeys.has(tagKey(hint))
					),
					proposeNew: []
				});
				return;
			}
			setTray({
				reuse: result.suggest.reuse,
				proposeNew: result.suggest.proposeNew
			});
			if (result.pendingAliasMerges.length) {
				const merged = [...pendingAliasMerges];
				for (const item of result.pendingAliasMerges) {
					const idx = merged.findIndex(
						row => tagKey(row.canonical) === tagKey(item.canonical)
					);
					if (idx >= 0) {
						merged[idx] = {
							canonical: merged[idx].canonical,
							aliases: [
								...new Set([...merged[idx].aliases, ...item.aliases])
							]
						};
					} else {
						merged.push(item);
					}
				}
				onPendingAliasMergesChange(merged);
			}
		});
	}

	return (
		<div className="space-y-3 sm:col-span-2">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<Label>Tags</Label>
					<p className="text-xs text-[#888]">
						Selected chips only — aliases stay hidden. Include languages when
						useful.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					className="rounded-[2px]"
					onClick={runSuggest}
					disabled={suggestPending}
				>
					{suggestPending ? 'Suggesting…' : 'Suggest tags'}
				</Button>
			</div>

			{selected.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{selected.map(tag => (
						<span
							key={tag.name}
							className={`inline-flex items-center gap-1 border px-2 py-1 text-xs ${
								tag.isNew
									? 'border-amber-700 bg-amber-50 text-amber-950'
									: 'border-[#b8a99a] text-[#444]'
							}`}
						>
							{tag.name}
							{tag.isNew ? (
								<span className="text-[10px] uppercase tracking-wide">
									new
								</span>
							) : null}
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
			) : (
				<p className="text-xs text-[#999]">No tags selected yet.</p>
			)}

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="tag_search">Search existing</Label>
					<Input
						id="tag_search"
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder="Match name or alias…"
					/>
					{searchHits.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{searchHits.map(tag => (
								<button
									key={tag}
									type="button"
									onClick={() => addCanonical(tag)}
									className="border border-[#b8a99a] px-2 py-1 text-xs text-[#444] hover:bg-[#f7f2ec]"
								>
									+ {tag}
								</button>
							))}
						</div>
					) : null}
				</div>
				<div className="space-y-2">
					<Label htmlFor="tag_add_new">Add new tag</Label>
					<div className="flex gap-2">
						<Input
							id="tag_add_new"
							value={addNew}
							onChange={e => setAddNew(e.target.value)}
							placeholder="New canonical name"
							onKeyDown={e => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addCanonical(addNew, true);
								}
							}}
						/>
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={() => addCanonical(addNew, true)}
						>
							Add
						</Button>
					</div>
				</div>
			</div>

			{suggestError ? (
				<p className="text-xs text-amber-800" role="status">
					{suggestError} Showing deterministic Places hints when available.
				</p>
			) : null}

			{tray && (tray.reuse.length > 0 || tray.proposeNew.length > 0) ? (
				<div className="space-y-2 border border-[#e5e5e5] p-3">
					<p className="text-xs font-medium text-[#444]">Suggestions</p>
					<div className="flex flex-wrap gap-2">
						{tray.reuse.map(tag => (
							<button
								key={`reuse-${tag}`}
								type="button"
								disabled={selectedKeys.has(tagKey(tag))}
								onClick={() => acceptSuggestion(tag, false)}
								className="border border-[#b8a99a] px-2 py-1 text-xs text-[#444] hover:bg-[#f7f2ec] disabled:opacity-40"
							>
								+ {tag}
							</button>
						))}
						{tray.proposeNew.map(item => (
							<button
								key={`new-${item.name}`}
								type="button"
								disabled={selectedKeys.has(tagKey(item.name))}
								onClick={() =>
									acceptSuggestion(item.name, true, item.aliases)
								}
								className="border border-amber-700 bg-amber-50 px-2 py-1 text-xs text-amber-950 hover:bg-amber-100 disabled:opacity-40"
							>
								+ {item.name} (new)
							</button>
						))}
					</div>
				</div>
			) : null}

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
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Remove tag?</DialogTitle>
						<DialogDescription>
							Remove “{removeCandidate}” from this listing? You can add it again
							later.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={() => setRemoveCandidate(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="rounded-[2px] border border-red-800 bg-red-700 text-white hover:bg-red-800"
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
