'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	placeDetails,
	placesAutocomplete
} from '@/lib/listings/places';
import {
	PLACES_RADIUS_DEFAULT_M,
	PLACES_RADIUS_EXPANDED_M
} from '@/lib/listings/places-constants';
import type {
	PlaceAutofill,
	PlacesAutocompleteMode,
	PlaceSuggestion
} from '@/lib/listings/types';

export type PlacesLookupStep = 'business' | 'address';

type PlacesLookupProps = {
	step: PlacesLookupStep;
	onStepChange: (step: PlacesLookupStep) => void;
	onPlaceSelected: (place: PlaceAutofill) => void;
	onSkipToDetails: () => void;
	onCancel?: () => void;
	showCancel?: boolean;
};

export default function PlacesLookup({
	step,
	onStepChange,
	onPlaceSelected,
	onSkipToDetails,
	onCancel,
	showCancel = false
}: PlacesLookupProps) {
	const [query, setQuery] = useState('');
	const [expandedRadius, setExpandedRadius] = useState(false);
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const [selecting, setSelecting] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);

	const mode: PlacesAutocompleteMode =
		step === 'business' ? 'business' : 'address';
	const radiusMeters = expandedRadius
		? PLACES_RADIUS_EXPANDED_M
		: PLACES_RADIUS_DEFAULT_M;

	useEffect(() => {
		setQuery('');
		setSuggestions([]);
		setError(null);
		setMessage(null);
	}, [step]);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		const trimmed = query.trim();
		if (trimmed.length < 2) {
			setSuggestions([]);
			setMessage(null);
			return;
		}

		debounceRef.current = setTimeout(() => {
			const requestId = ++requestIdRef.current;
			startTransition(async () => {
				setError(null);
				const result = await placesAutocomplete({
					input: trimmed,
					mode,
					radiusMeters
				});
				if (requestId !== requestIdRef.current) return;
				if (!result.ok) {
					setError(result.error);
					setSuggestions([]);
					return;
				}
				setSuggestions(result.suggestions);
				if (result.suggestions.length === 0) {
					setMessage(
						step === 'business'
							? 'No nearby businesses matched. Try a longer name, expand the radius, or skip to address lookup.'
							: 'No address matches nearby. Expand the radius, or skip to enter details manually.'
					);
				} else {
					setMessage(null);
				}
			});
		}, 300);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, mode, radiusMeters, step]);

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

	function skipCurrent() {
		if (step === 'business') {
			onStepChange('address');
			return;
		}
		onSkipToDetails();
	}

	return (
		<section className="space-y-4 border border-[#b8a99a]/40 bg-[#f7f2ec]/60 p-4">
			<div className="space-y-1">
				<p className="text-xs uppercase tracking-wide text-[#888]">
					Step {step === 'business' ? '1 of 2' : '2 of 2'} · Google Places
				</p>
				<h3 className="text-sm font-medium text-[#444]">
					{step === 'business'
						? 'Find the business by name'
						: 'Look up the address'}
				</h3>
				<p className="text-xs text-[#666]">
					{step === 'business'
						? 'Suggestions are biased to places within 30 km of Castelfalfi (Italy). Skip if nothing matches.'
						: 'Use this for addresses that are not a listed business (markets, private venues). Or skip to fill the form by hand.'}
				</p>
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
					{step === 'business' ? 'Business name' : 'Address'}
				</Label>
				<Input
					id="places-lookup-query"
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder={
						step === 'business' ? 'e.g. Locanda, Osteria…' : 'e.g. Piazza…, Via…'
					}
					autoComplete="off"
					disabled={selecting}
				/>
			</div>

			<label className="flex items-center gap-2 text-xs text-[#666]">
				<input
					type="checkbox"
					checked={expandedRadius}
					onChange={e => setExpandedRadius(e.target.checked)}
					disabled={selecting}
				/>
				Expand search to 60 km
			</label>

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
								<span className="text-[#444]">{suggestion.primaryText}</span>
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

			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="outline"
					className="rounded-[2px]"
					onClick={skipCurrent}
					disabled={selecting}
				>
					{step === 'business' ? 'Skip to address lookup' : 'Skip to manual entry'}
				</Button>
				{step === 'address' ? (
					<Button
						type="button"
						variant="outline"
						className="rounded-[2px]"
						onClick={() => onStepChange('business')}
						disabled={selecting}
					>
						Back to business name
					</Button>
				) : null}
				{showCancel && onCancel ? (
					<Button
						type="button"
						variant="ghost"
						className="rounded-[2px]"
						onClick={onCancel}
						disabled={selecting}
					>
						Cancel lookup
					</Button>
				) : null}
			</div>
		</section>
	);
}
