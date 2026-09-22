'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
	categoryFromPathname,
	filterListings,
	listingHasCoords,
	suggest,
	type Listing
} from '@/lib/listings-search';
import {
	BROWSE_SEARCH_HASH,
	browseUrlHref,
	browseUrlSearchParams,
	parseBrowseUrl,
	type BrowseUrlState
} from '@/lib/listings/browse-url';
import {
	fetchListingsForCategory,
	fetchTagAliasMap
} from '@/lib/listings/fetch-client';
import { createClient } from '@/lib/supabase/client';
import { Search, X } from 'lucide-react';
import {
	type CSSProperties,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import ListingResultCard from './listing-result-card';
import LocationsMap from './locations-map';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	AnalyticsEvents,
	useAnalytics
} from '@/components/analytics/posthog-provider';

const CATEGORY_LABELS: Record<string, string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

const CATEGORY_SEARCH_PLACEHOLDERS: Record<string, string> = {
	'food-dining': 'e.g. vegan, Casa Masi',
	'services-maintenance': 'e.g. gardening, TERMAK',
	'health-wellness': 'e.g. Dentist, Farmacia Priamo',
	'shop-market': 'e.g. coffee, Chelotti Roasting'
};

const MAP_HEIGHT_MIN_VH = 0.12;
const MAP_HEIGHT_MAX_VH = 0.55;
/** Matches former `aspect-[1.618/1]` — width / height. */
const MAP_ASPECT_RATIO = 1.618;
/** Mobile sticky map shell uses `px-4` (32px total). */
const MAP_SHELL_PADDING_X = 32;

function clampMapHeightPx(px: number, viewportHeight: number) {
	const min = viewportHeight * MAP_HEIGHT_MIN_VH;
	const max = viewportHeight * MAP_HEIGHT_MAX_VH;
	return Math.round(Math.min(max, Math.max(min, px)));
}

function mapHeightFromWidth(widthPx: number, viewportHeight: number) {
	return clampMapHeightPx(widthPx / MAP_ASPECT_RATIO, viewportHeight);
}

function defaultMapHeightPx(viewportWidth = 390, viewportHeight = 800) {
	return mapHeightFromWidth(
		Math.max(0, viewportWidth - MAP_SHELL_PADDING_X),
		viewportHeight
	);
}

type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

export default function ListingsBrowse(props: {
	caption?: string | null;
	heading?: string | null;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const category = categoryFromPathname(pathname);
	const { track } = useAnalytics();

	const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
	const [listings, setListings] = useState<Listing[]>([]);
	const [aliasMap, setAliasMap] = useState<Map<string, string[]>>(
		() => new Map()
	);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [query, setQuery] = useState('');
	const [activeTags, setActiveTags] = useState<string[]>([]);
	const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(
		() => parseBrowseUrl(searchParams).place ?? null
	);
	const [highlightedPlaceName, setHighlightedPlaceName] = useState<
		string | null
	>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	// Non-sticky sentinel: scrollIntoView on the sticky bar is a no-op while it is
	// already stuck at the top of the viewport, which is exactly when we need to scroll.
	const scrollAnchorRef = useRef<HTMLDivElement>(null);
	const pendingScrollToSearchRef = useRef(false);
	const [searchBarHeight, setSearchBarHeight] = useState(0);
	const [mapHeightPx, setMapHeightPx] = useState(() =>
		typeof window === 'undefined'
			? defaultMapHeightPx()
			: defaultMapHeightPx(window.innerWidth, window.innerHeight)
	);
	const mapShellRef = useRef<HTMLDivElement>(null);
	const mapHeightInitializedRef = useRef(false);
	const mapDragStartYRef = useRef(0);
	const mapDragStartHeightRef = useRef(0);
	const inputId = useId();

	useLayoutEffect(() => {
		if (mapHeightInitializedRef.current) return;
		const el = mapShellRef.current;
		if (!el) return;
		const styles = getComputedStyle(el);
		const padX =
			parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
		const width = el.clientWidth - padX;
		if (width <= 0) return;
		mapHeightInitializedRef.current = true;
		setMapHeightPx(mapHeightFromWidth(width, window.innerHeight));
	}, []);

	useEffect(() => {
		function onViewportResize() {
			setMapHeightPx(prev => clampMapHeightPx(prev, window.innerHeight));
		}
		window.addEventListener('resize', onViewportResize);
		return () => window.removeEventListener('resize', onViewportResize);
	}, []);

	function onMapResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		mapDragStartYRef.current = event.clientY;
		mapDragStartHeightRef.current = mapHeightPx;
	}

	function onMapResizePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
		if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
		const deltaY = event.clientY - mapDragStartYRef.current;
		setMapHeightPx(
			clampMapHeightPx(
				mapDragStartHeightRef.current + deltaY,
				window.innerHeight
			)
		);
	}

	function onMapResizePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	function onMapResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
		const step = 24;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setMapHeightPx(prev =>
				clampMapHeightPx(prev - step, window.innerHeight)
			);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			setMapHeightPx(prev =>
				clampMapHeightPx(prev + step, window.innerHeight)
			);
		}
	}

	const mapHeightVhNow = Math.round(
		(mapHeightPx /
			(typeof window !== 'undefined' ? window.innerHeight : 800)) *
			100
	);

	function requestScrollToSearch() {
		pendingScrollToSearchRef.current = true;
	}

	function replaceBrowseState(patch: Partial<BrowseUrlState>) {
		const nextParams = browseUrlSearchParams(searchParams, patch);
		const nextHref = browseUrlHref(pathname, nextParams);
		const currentHref = browseUrlHref(
			pathname,
			new URLSearchParams(searchParams.toString())
		);
		if (nextHref !== currentHref) {
			router.replace(nextHref, { scroll: false });
		}
	}

	function clearPlaceSelection() {
		setSelectedPlaceName(null);
		replaceBrowseState({ place: undefined });
	}

	useEffect(() => {
		const placeFromUrl = parseBrowseUrl(searchParams).place ?? null;
		setSelectedPlaceName(prev => (prev === placeFromUrl ? prev : placeFromUrl));
		// Mirror place focus in the search box so list + map read like a search.
		if (placeFromUrl) {
			setQuery(prev => (prev === placeFromUrl ? prev : placeFromUrl));
			setPanelOpen(false);
		}
	}, [searchParams]);

	// Deep links (`?place=` / `#listings-browse-search`) land with the search bar
	// flush to the top of the viewport (hero content scrolled away).
	useLayoutEffect(() => {
		if (authStatus !== 'signed_in') return;

		const placeFromUrl = parseBrowseUrl(searchParams).place;
		const hashTargetsSearch =
			typeof window !== 'undefined' &&
			window.location.hash === `#${BROWSE_SEARCH_HASH}`;
		if (!placeFromUrl && !hashTargetsSearch) return;

		const anchor = scrollAnchorRef.current;
		if (!anchor) return;

		const scrollAnchorToTop = () => {
			const top = anchor.getBoundingClientRect().top + window.scrollY;
			window.scrollTo({ top, behavior: 'auto' });
		};

		scrollAnchorToTop();
		requestAnimationFrame(scrollAnchorToTop);
	}, [authStatus, searchParams, listings.length]);

	useEffect(() => {
		const supabase = createClient();
		let cancelled = false;

		async function syncAuth() {
			const { data } = await supabase.auth.getClaims();
			if (cancelled) return;
			setAuthStatus(data?.claims ? 'signed_in' : 'signed_out');
		}

		syncAuth();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setAuthStatus(session ? 'signed_in' : 'signed_out');
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (authStatus !== 'signed_in') {
			setListings([]);
			setAliasMap(new Map());
			setLoadError(null);
			return;
		}

		let cancelled = false;

		async function load() {
			try {
				const [rows, aliases] = await Promise.all([
					fetchListingsForCategory(category),
					fetchTagAliasMap()
				]);
				if (!cancelled) {
					setListings(rows);
					setAliasMap(aliases);
					setLoadError(null);
				}
			} catch (error) {
				if (!cancelled) {
					setListings([]);
					setAliasMap(new Map());
					setLoadError(
						error instanceof Error
							? error.message
							: 'Could not load recommendations.'
					);
				}
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [authStatus, category]);

	// Suggestions follow every keystroke; map/list only update on confirmed picks.
	const suggestions = useMemo(
		() => suggest(query, listings, activeTags, aliasMap),
		[query, listings, activeTags, aliasMap]
	);

	const results = useMemo(() => {
		const filtered =
			activeTags.length === 0
				? listings
				: filterListings(listings, activeTags, '', aliasMap);

		// Place focus acts like a search: list + map show only that listing.
		if (selectedPlaceName) {
			return filtered.filter(listing => listing.name === selectedPlaceName);
		}

		return filtered;
	}, [listings, activeTags, aliasMap, selectedPlaceName]);

	const mapLocations = useMemo(
		() => results.filter(listingHasCoords),
		[results]
	);

	const showSuggestions =
		panelOpen &&
		query.trim().length > 0 &&
		(suggestions.tags.length > 0 || suggestions.places.length > 0);

	const showSuggestionPanel = panelOpen && query.trim().length > 0;

	const topKeyword = suggestions.tags[0] ?? null;

	const isFiltered = activeTags.length > 0 || Boolean(selectedPlaceName);

	useEffect(() => {
		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setPanelOpen(false);
			}
		};

		document.addEventListener('mousedown', onPointerDown);
		return () => document.removeEventListener('mousedown', onPointerDown);
	}, []);

	// Keep the sticky map parked just under the search bar (height changes with tags).
	useLayoutEffect(() => {
		if (authStatus !== 'signed_in') return;

		const el = rootRef.current;
		if (!el || typeof ResizeObserver === 'undefined') return;

		const update = () => {
			setSearchBarHeight(el.getBoundingClientRect().height);
		};

		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => observer.disconnect();
	}, [authStatus]);

	// After a filter that shortens the list, document height collapses and the
	// browser clamps scroll — which makes the sticky search/map look like they
	// jumped. Scroll the in-flow anchor (not the sticky bar) to the top.
	useLayoutEffect(() => {
		if (!pendingScrollToSearchRef.current) return;
		pendingScrollToSearchRef.current = false;
		const anchor = scrollAnchorRef.current;
		if (!anchor) return;

		const scrollAnchorToTop = () => {
			const top = anchor.getBoundingClientRect().top + window.scrollY;
			window.scrollTo({ top, behavior: 'auto' });
		};

		scrollAnchorToTop();
		// Map/list height can settle a frame later; re-apply so clamp doesn't win.
		requestAnimationFrame(scrollAnchorToTop);
	}, [results, activeTags, selectedPlaceName]);

	function addTag(tag: string) {
		requestScrollToSearch();
		setActiveTags(prev =>
			prev.some(t => t.toLowerCase() === tag.toLowerCase())
				? prev
				: [...prev, tag]
		);
		setQuery('');
		clearPlaceSelection();
		setPanelOpen(false);
		track(AnalyticsEvents.DIRECTORY_FILTER_USED, { filter_key: 'tag' });
		track(AnalyticsEvents.DIRECTORY_SEARCHED, {
			query_length: tag.length
		});
	}

	function removeTag(tag: string) {
		setActiveTags(prev =>
			prev.filter(t => t.toLowerCase() !== tag.toLowerCase())
		);
		clearPlaceSelection();
	}

	function selectPlace(listing: Listing) {
		setSelectedPlaceName(listing.name);
		setQuery(listing.name);
		replaceBrowseState({ place: listing.name });
		setPanelOpen(false);
		track(AnalyticsEvents.PLACE_OPENED, {
			category: listing.category
		});
		track(AnalyticsEvents.DIRECTORY_SEARCHED, {
			query_length: listing.name.length
		});
	}

	function clearAll() {
		setQuery('');
		setActiveTags([]);
		clearPlaceSelection();
		setPanelOpen(false);
	}

	function confirmTopKeyword() {
		if (!topKeyword) return;
		addTag(topKeyword);
	}

	if (authStatus === 'loading') {
		return (
			<section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
				<div className="mx-auto max-w-[1400px]">
					<p className="font-heading text-sm text-[#666666]">Loading places…</p>
				</div>
			</section>
		);
	}

	if (authStatus === 'signed_out') {
		const search = searchParams.toString();
		const next = `${pathname || '/place'}${search ? `?${search}` : ''}`;
		return (
			<section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
				<div className="mx-auto max-w-[1400px]">
					<div className="border border-[#d9cbb8] bg-[#f7f2ec] px-6 py-10 text-center sm:px-10">
						<h2 className="font-heading text-2xl text-[#805b32]">
							Members places map
						</h2>
						<p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#57422a]">
							Local recommendations and map pins are available after you sign
							in. Ask an admin for an invitation if you do not have an account
							yet.
						</p>
						<Link
							href={`/sign-in?next=${encodeURIComponent(next)}`}
							className={cn(
								buttonVariants({ variant: 'default' }),
								'mt-6 w-full sm:w-auto'
							)}
						>
							Sign in to browse
						</Link>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="bg-white">
			{loadError ? (
				<div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6 lg:px-8">
					<p
						className="mb-6 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
						role="alert"
					>
						{loadError}
					</p>
				</div>
			) : null}

			{showSuggestionPanel ? (
				<button
					type="button"
					aria-label="Dismiss search suggestions"
					className="fixed inset-0 z-[35] border-0 bg-[#eeeae4]/25 backdrop-blur-sm"
					onClick={() => setPanelOpen(false)}
				/>
			) : null}

			<div
				id={BROWSE_SEARCH_HASH}
				ref={scrollAnchorRef}
				className="h-0 scroll-mt-0"
				aria-hidden="true"
			/>
			<div
				ref={rootRef}
				className="sticky top-0 z-40 w-full bg-[#eeeae4] py-5 sm:py-8"
			>
				<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center lg:gap-8 lg:px-8">
					{props.heading ? (
						<h2 className="font-heading w-full text-2xl font-normal text-[#333333] sm:text-3xl lg:pl-3 lg:text-4xl xl:text-5xl">
							{props.heading}
						</h2>
					) : null}

					<div className="relative w-full min-w-0">
						{activeTags.length > 0 ? (
							<div className="mb-3">
								<p className="font-heading mb-2 text-xs tracking-wide text-[#7A5A32] uppercase">
									Filtering by keywords:
								</p>
								<div className="flex flex-wrap gap-2">
									{activeTags.map(tag => (
										<button
											key={tag}
											type="button"
											onClick={() => removeTag(tag)}
											className="font-heading inline-flex items-center gap-1.5 bg-[#805b32] px-3 py-1.5 text-sm text-white transition-colors hover:bg-[#6a4b29]"
											aria-label={`Remove keyword ${tag}`}
										>
											{tag}
											<X
												className="size-3.5"
												aria-hidden="true"
											/>
										</button>
									))}
								</div>
							</div>
						) : null}

						<label
							htmlFor={inputId}
							className="font-heading mb-2 block text-base text-[#333333]"
						>
							Filter recommendations using keywords or search for a business by
							name
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
								placeholder={
									(category && CATEGORY_SEARCH_PLACEHOLDERS[category]) ||
									'e.g. keyword, Business Name'
								}
								onChange={event => {
									setQuery(event.target.value);
									clearPlaceSelection();
									setPanelOpen(true);
								}}
								onFocus={() => {
									clearPlaceSelection();
									setPanelOpen(true);
								}}
								onKeyDown={event => {
									if (event.key === 'Enter') {
										event.preventDefault();
										confirmTopKeyword();
									}
									if (event.key === 'Escape') {
										setPanelOpen(false);
									}
								}}
								className="font-heading w-full border border-[#b8a99a] bg-white py-3.5 pr-12 pl-12 text-base text-[#333333] outline-none placeholder:text-[#999999] focus:border-[#7A5A32]"
							/>
							{(query || activeTags.length > 0) && (
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

						{showSuggestionPanel ? (
							<div className="absolute z-50 mt-1 w-full border border-[#b8a99a] bg-white shadow-sm">
								{showSuggestions ? (
									<>
										{suggestions.tags.length > 0 ? (
											<div className="border-b border-[#e8e4dc] px-4 py-3">
												<p className="font-heading mb-2 text-xs tracking-wide text-[#7A5A32] uppercase">
													Keywords
												</p>
												<div className="flex flex-wrap gap-2">
													{suggestions.tags.map((tag, index) => (
														<button
															key={tag}
															type="button"
															onClick={() => addTag(tag)}
															className={cn(
																'font-heading border px-3 py-1.5 text-sm text-[#333333] transition-colors',
																index === 0
																	? 'border-[#7A5A32] bg-[#f7f3ec]'
																	: 'border-[#b8a99a] hover:border-[#7A5A32] hover:bg-[#f7f3ec]'
															)}
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
																	{[place.type, CATEGORY_LABELS[place.category]]
																		.filter(Boolean)
																		.join(' · ')}
																</span>
															</button>
														</li>
													))}
												</ul>
											</div>
										) : null}
									</>
								) : (
									<p className="font-heading px-4 py-3 text-sm text-[#666666]">
										No places or keywords match your search.
									</p>
								)}
							</div>
						) : null}
					</div>
				</div>
			</div>

			{/* flex-col on small screens so sticky map can span over the scrolling list;
			    CSS grid rows would clip sticky to the map’s own row.
			    Map sticky wrapper is full-bleed (outside max-width padding) on mobile
			    so cards cannot show through at the sides. */}
			<div className="flex flex-col gap-6 lg:mx-auto lg:max-w-[1400px] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8 lg:px-8">
				{/* Map — sticky under search; full-width cover on mobile */}
				<div
					ref={mapShellRef}
					className="order-1 sticky z-30 h-fit w-full bg-[#eeeae4] px-4 pb-2 pt-0 rounded-b-4xl sm:px-6 md:pb-5 lg:order-2 lg:self-start lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-5"
					style={{ top: searchBarHeight }}
				>
					<LocationsMap
						locations={mapLocations}
						selectedName={selectedPlaceName}
						highlightedName={highlightedPlaceName}
						onSelect={listing => selectPlace(listing)}
						onClearSelect={clearPlaceSelection}
						showClearFocus={Boolean(selectedPlaceName)}
						onClearFocus={clearPlaceSelection}
						layoutKey={mapHeightPx}
						style={
							{
								['--browse-map-h']: `${mapHeightPx}px`
							} as CSSProperties
						}
						className="aspect-auto h-(--browse-map-h) md:h-[33vh] lg:h-[calc(100vh-186px)]"
					/>
					<div
						role="separator"
						aria-orientation="horizontal"
						aria-label="Resize map"
						aria-valuemin={Math.round(MAP_HEIGHT_MIN_VH * 100)}
						aria-valuemax={Math.round(MAP_HEIGHT_MAX_VH * 100)}
						aria-valuenow={mapHeightVhNow}
						tabIndex={0}
						className="flex h-5 cursor-ns-resize touch-none items-center justify-center md:hidden"
						onPointerDown={onMapResizePointerDown}
						onPointerMove={onMapResizePointerMove}
						onPointerUp={onMapResizePointerUp}
						onPointerCancel={onMapResizePointerUp}
						onKeyDown={onMapResizeKeyDown}
					>
						<span
							aria-hidden="true"
							className="h-1 w-10 rounded-full bg-[#b8a99a]"
						/>
					</div>
				</div>

				{/* List — scrolls under sticky search + map on mobile; left column on desktop */}
				<div className="relative order-2 [overflow-anchor:none] px-4 pt-5 sm:px-6 lg:order-1 lg:px-0">
					{isFiltered && results.length === 0 ? (
						<p className="font-heading text-base text-[#666666]">
							No places match your search.
						</p>
					) : null}

					{results.length > 0 ? (
						<div>
							<p className="font-heading mb-6 text-sm text-[#666666]">
								{results.length} {results.length === 1 ? 'place' : 'places'}
								{category ? ` in ${CATEGORY_LABELS[category] ?? category}` : ''}
							</p>
							{results.map((listing, index) => (
								<div key={`${listing.category}-${listing.name}`}>
									<div
										role="button"
										tabIndex={0}
										className={`-mx-3 cursor-pointer rounded-3xl px-3 py-8 transition-colors duration-200 ease-in-out ${
											highlightedPlaceName === listing.name ||
											selectedPlaceName === listing.name
												? 'bg-[#f7f3ec]'
												: 'bg-transparent'
										}`}
										onMouseEnter={() => setHighlightedPlaceName(listing.name)}
										onMouseLeave={() => setHighlightedPlaceName(null)}
										onClick={() => selectPlace(listing)}
										onKeyDown={event => {
											if (event.key === 'Enter' || event.key === ' ') {
												event.preventDefault();
												selectPlace(listing);
											}
										}}
									>
										<ListingResultCard listing={listing} />
									</div>
									{index < results.length - 1 ? (
										<hr className="border-[#b8a99a]" />
									) : null}
								</div>
							))}
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}
