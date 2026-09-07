'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	placeDetails,
	placesAutocomplete
} from '@/lib/listings/places';
import type {
	PlaceAutofill,
	PlacesAutocompleteMode,
	PlaceSuggestion
} from '@/lib/listings/types';

type PlacesLookupProps = {
	onPlaceSelected: (place: PlaceAutofill) => void;
	onSkipToDetails: () => void;
};

export default function PlacesLookup({
	onPlaceSelected,
	onSkipToDetails
}: PlacesLookupProps) {
	const [mode, setMode] = useState<PlacesAutocompleteMode>('business');
	const [query, setQuery] = useState('');
	const [expandedSearch, setExpandedSearch] = useState(false);
	const [showWidenOption, setShowWidenOption] = useState(false);
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const [selecting, setSelecting] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);
	const skipExpandedEffectRef = useRef(false);

	useEffect(() => {
		if (skipExpandedEffectRef.current) {
			skipExpandedEffectRef.current = false;
			return;
		}

		if (debounceRef.current) clearTimeout(debounceRef.current);

		const trimmed = query.trim();
		if (trimmed.length < 2) {
			debounceRef.current = setTimeout(() => {
				setSuggestions([]);
				setMessage(null);
				setShowWidenOption(false);
			}, 0);
			return () => {
				if (debounceRef.current) clearTimeout(debounceRef.current);
			};
		}

		debounceRef.current = setTimeout(() => {
			const requestId = ++requestIdRef.current;
			startTransition(async () => {
				setError(null);

				let usedExpanded = expandedSearch;
				let result = await placesAutocomplete({
					input: trimmed,
					mode,
					expanded: usedExpanded
				});
				if (requestId !== requestIdRef.current) return;

				if (
					result.ok &&
					result.suggestions.length === 0 &&
					!usedExpanded
				) {
					result = await placesAutocomplete({
						input: trimmed,
						mode,
						expanded: true
					});
					if (requestId !== requestIdRef.current) return;
					if (result.ok) {
						usedExpanded = true;
						skipExpandedEffectRef.current = true;
						setExpandedSearch(true);
						setShowWidenOption(true);
					}
				}

				if (!result.ok) {
					setError(result.error);
					setSuggestions([]);
					setMessage(null);
					return;
				}

				setSuggestions(result.suggestions);
				if (result.suggestions.length === 0) {
					setShowWidenOption(true);
					setMessage(
						mode === 'business'
							? 'Still nothing — try a different name, search by address, or enter details manually.'
							: 'Still nothing — try a different address, or enter details manually.'
					);
				} else {
					setMessage(null);
					if (usedExpanded) setShowWidenOption(true);
				}
			});
		}, 300);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, mode, expandedSearch]);

	async function selectSuggestion(suggestion: PlaceSuggestion) {
		setSelecting(true);
		setError(null);
		try {
			const result = await placeDetails(suggestion.placeId);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			onPlaceSelected(result.place);
		} finally {
			setSelecting(false);
		}
	}

	function toggleMode() {
		setMode(current => (current === 'business' ? 'address' : 'business'));
		setQuery('');
		setSuggestions([]);
		setError(null);
		setMessage(null);
		setExpandedSearch(false);
		setShowWidenOption(false);
	}

	return (
		<section className="space-y-4">
			<div className="space-y-1">
				<h3 className="text-sm font-medium text-[#444]">
					{mode === 'business'
						? 'Search by name'
						: 'Search by address'}
				</h3>
			</div>

			{error ? (
				<p
					className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}
			{message ? (
				<p
					className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
					role="status"
				>
					{message}
				</p>
			) : null}

			<div className="space-y-2">
				<Label htmlFor="places-lookup-query">
					{mode === 'business' ? 'Place name' : 'Address'}
				</Label>
				<Input
					id="places-lookup-query"
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder={
						mode === 'business'
							? 'e.g. Locanda, Osteria…'
							: 'e.g. Piazza…, Via…'
					}
					autoComplete="off"
					disabled={selecting}
				/>
			</div>

			{showWidenOption ? (
				<label className="flex items-center gap-2 text-xs text-[#666]">
					<input
						type="checkbox"
						checked={expandedSearch}
						onChange={e => setExpandedSearch(e.target.checked)}
						disabled={selecting}
					/>
					Widen search area
				</label>
			) : null}

			{suggestions.length > 0 ? (
				<ul className="divide-y divide-[#e5e5e5] border border-[#e5e5e5] bg-white">
					{suggestions.map(suggestion => (
						<li key={suggestion.placeId}>
							<button
								type="button"
								disabled={selecting || pending}
								className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[#f7f2ec] disabled:opacity-60"
								onClick={() => selectSuggestion(suggestion)}
							>
								<span className="text-[#444]">
									{suggestion.primaryText}
								</span>
								{suggestion.secondaryText ? (
									<span className="text-xs text-[#888]">
										{suggestion.secondaryText}
									</span>
								) : null}
							</button>
						</li>
					))}
				</ul>
			) : null}

			{(pending || selecting) && query.trim().length >= 2 ? (
				<p className="text-xs text-[#888]">
					{selecting ? 'Loading place details…' : 'Searching…'}
				</p>
			) : null}

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<button
					type="button"
					className="text-xs text-[#666] underline-offset-2 hover:underline disabled:opacity-60"
					onClick={toggleMode}
					disabled={selecting}
				>
					{mode === 'business'
						? 'Search by address instead'
						: 'Search by name instead'}
				</button>
				<Button
					type="button"
					variant="ghost"
					className="h-auto rounded-[2px] px-0 text-xs text-[#666]"
					onClick={onSkipToDetails}
					disabled={selecting}
				>
					Enter details manually
				</Button>
			</div>
		</section>
	);
}
