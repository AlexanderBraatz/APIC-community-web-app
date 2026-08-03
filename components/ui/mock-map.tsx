'use client';

import {
	filterListings,
	getListingsForCategory,
	listingHasCoords,
	suggest,
	type Listing
} from '@/lib/listings-search';
import { PageBlocksMockMap } from '@/tina/__generated__/types';
import { Search, X } from 'lucide-react';
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import LocationsMap from './locations-map';

const RESULT_FIELDS = [
	{ key: 'name', label: 'Name' },
	{ key: 'type', label: 'Type' },
	{ key: 'contact', label: 'Contact' },
	{ key: 'remark', label: 'Remark' }
] as const;

const CATEGORY_LABELS: Record<string, string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

export default function MockMap(_props: PageBlocksMockMap) {
	const listings = useMemo(() => getListingsForCategory(null), []);

	const [query, setQuery] = useState('');
	const [activeTags, setActiveTags] = useState<string[]>([]);
	const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	const deferredQuery = useDeferredValue(query);
	const rootRef = useRef<HTMLDivElement>(null);
	const inputId = useId();

	const suggestions = useMemo(
		() => suggest(deferredQuery, listings, activeTags),
		[deferredQuery, listings, activeTags]
	);

	const results = useMemo(() => {
		if (selectedPlaceName) {
			return listings.filter(listing => listing.name === selectedPlaceName);
		}

		if (activeTags.length === 0 && !deferredQuery.trim()) {
			return [];
		}

		return filterListings(listings, activeTags, deferredQuery);
	}, [listings, activeTags, deferredQuery, selectedPlaceName]);

	const mapLocations = useMemo(() => {
		const scoped =
			activeTags.length > 0 || deferredQuery.trim() || selectedPlaceName
				? results
				: listings;
		return scoped.filter(listingHasCoords);
	}, [listings, results, activeTags, deferredQuery, selectedPlaceName]);

	const showSuggestions =
		panelOpen &&
		deferredQuery.trim().length > 0 &&
		(suggestions.tags.length > 0 || suggestions.places.length > 0);

	const showHint = activeTags.length === 0 && !query.trim() && !selectedPlaceName;

	useEffect(() => {
		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setPanelOpen(false);
			}
		};

		document.addEventListener('mousedown', onPointerDown);
		return () => document.removeEventListener('mousedown', onPointerDown);
	}, []);

	function addTag(tag: string) {
		setActiveTags(prev =>
			prev.some(t => t.toLowerCase() === tag.toLowerCase()) ? prev : [...prev, tag]
		);
		setQuery('');
		setSelectedPlaceName(null);
		setPanelOpen(false);
	}

	function removeTag(tag: string) {
		setActiveTags(prev => prev.filter(t => t.toLowerCase() !== tag.toLowerCase()));
		setSelectedPlaceName(null);
	}

	function selectPlace(listing: Listing) {
		setSelectedPlaceName(listing.name);
		setQuery('');
		setPanelOpen(false);
	}

	function clearAll() {
		setQuery('');
		setActiveTags([]);
		setSelectedPlaceName(null);
		setPanelOpen(false);
	}

	return (
		<section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
			<div className="mx-auto max-w-[1400px]">
				<LocationsMap
					locations={mapLocations}
					selectedName={selectedPlaceName}
					onSelect={listing => selectPlace(listing)}
				/>

				<div
					ref={rootRef}
					className="relative mt-8"
				>
					<label
						htmlFor={inputId}
						className="sr-only"
					>
						Search places and tags
					</label>
					<div className="relative">
						<Search
							className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#7A5A32]"
							aria-hidden="true"
						/>
						<input
							id={inputId}
							type="search"
							value={query}
							autoComplete="off"
							placeholder="Search by tag or place name"
							onChange={event => {
								setQuery(event.target.value);
								setSelectedPlaceName(null);
								setPanelOpen(true);
							}}
							onFocus={() => setPanelOpen(true)}
							className="font-heading w-full border border-[#b8a99a] bg-white py-3.5 pr-12 pl-12 text-base text-[#333333] outline-none placeholder:text-[#999999] focus:border-[#7A5A32]"
						/>
						{(query || activeTags.length > 0 || selectedPlaceName) && (
							<button
								type="button"
								onClick={clearAll}
								className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1.5 text-[#7A5A32] transition-colors hover:bg-[#f3eee6]"
								aria-label="Clear search"
							>
								<X className="size-4" />
							</button>
						)}
					</div>

					{showSuggestions ? (
						<div className="absolute z-20 mt-1 w-full border border-[#b8a99a] bg-white shadow-sm">
							{suggestions.tags.length > 0 ? (
								<div className="border-b border-[#e8e4dc] px-4 py-3">
									<p className="font-heading mb-2 text-xs tracking-wide text-[#7A5A32] uppercase">
										Tags
									</p>
									<div className="flex flex-wrap gap-2">
										{suggestions.tags.map(tag => (
											<button
												key={tag}
												type="button"
												onClick={() => addTag(tag)}
												className="font-heading border border-[#b8a99a] px-3 py-1.5 text-sm text-[#333333] transition-colors hover:border-[#7A5A32] hover:bg-[#f7f3ec]"
											>
												{tag}
											</button>
										))}
									</div>
								</div>
							) : null}

							{suggestions.places.length > 0 ? (
								<div className="px-2 py-2">
									<p className="font-heading px-2 py-1 text-xs tracking-wide text-[#7A5A32] uppercase">
										Places
									</p>
									<ul>
										{suggestions.places.map(place => (
											<li key={`${place.category}-${place.name}`}>
												<button
													type="button"
													onClick={() => selectPlace(place)}
													className="font-heading flex w-full flex-col items-start px-2 py-2.5 text-left transition-colors hover:bg-[#f7f3ec]"
												>
													<span className="text-base text-[#333333]">
														{place.name}
													</span>
													<span className="text-sm text-[#666666]">
														{[
															place.type,
															CATEGORY_LABELS[place.category]
														]
															.filter(Boolean)
															.join(' · ')}
													</span>
												</button>
											</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					) : null}

					{activeTags.length > 0 ? (
						<div className="mt-3 flex flex-wrap gap-2">
							{activeTags.map(tag => (
								<button
									key={tag}
									type="button"
									onClick={() => removeTag(tag)}
									className="font-heading inline-flex items-center gap-1.5 bg-[#805b32] px-3 py-1.5 text-sm text-white transition-colors hover:bg-[#6a4b29]"
									aria-label={`Remove tag ${tag}`}
								>
									{tag}
									<X
										className="size-3.5"
										aria-hidden="true"
									/>
								</button>
							))}
						</div>
					) : null}

					{showHint ? (
						<p className="font-heading mt-4 text-sm text-[#666666]">
							Search by tag or place name
						</p>
					) : null}

					{!showHint && results.length === 0 ? (
						<p className="font-heading mt-6 text-base text-[#666666]">
							No places match your search.
						</p>
					) : null}

					{results.length > 0 ? (
						<div className="mt-8">
							<p className="font-heading mb-6 text-sm text-[#666666]">
								{results.length}{' '}
								{results.length === 1 ? 'place' : 'places'}
							</p>
							{results.map((listing, index) => (
								<article
									key={`${listing.category}-${listing.name}`}
									className="pb-12 last:pb-0"
								>
									<div className="space-y-4">
										<p className="font-heading text-sm tracking-wide text-[#7A5A32] uppercase">
											{CATEGORY_LABELS[listing.category] ??
												listing.category}
										</p>
										{RESULT_FIELDS.map(({ key, label }) => {
											const value = listing[key];
											if (!value) return null;

											return (
												<p
													key={key}
													className="font-heading text-lg leading-[1.75] text-[#333333]"
												>
													{label} :{' '}
													<span className="font-normal">{value}</span>
												</p>
											);
										})}
									</div>
									{index < results.length - 1 ? (
										<hr className="mt-12 border-[#b8a99a]" />
									) : null}
								</article>
							))}
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}
