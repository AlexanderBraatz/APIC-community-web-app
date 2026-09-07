'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	categoryFromPathname,
	filterListings,
	listingHasCoords,
	suggest,
	type Listing
} from '@/lib/listings-search';
import {
	CONTACT_KIND_LABELS,
	telHref,
	websiteHref,
	websiteLabel,
	whatsappHref
} from '@/lib/listings/contacts';
import { formatOpeningHoursLines } from '@/lib/listings/opening-hours';
import { fetchListingsForCategory, fetchTagAliasMap } from '@/lib/listings/fetch-client';
import { createClient } from '@/lib/supabase/client';
import {
	Clock,
	Globe,
	Mail,
	Map as MapIcon,
	MapPin,
	MessageCircle,
	Phone,
	Search,
	X
} from 'lucide-react';
import {
	useDeferredValue,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import LocationsMap from './locations-map';

const CATEGORY_LABELS: Record<string, string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

function ContactIcon({ kind }: { kind: Listing['contacts'][number]['kind'] }) {
	const className = 'size-4 shrink-0 text-[#7A5A32]';
	if (kind === 'email')
		return (
			<Mail
				className={className}
				aria-hidden="true"
			/>
		);
	if (kind === 'website')
		return (
			<Globe
				className={className}
				aria-hidden="true"
			/>
		);
	if (kind === 'whatsapp')
		return (
			<MessageCircle
				className={className}
				aria-hidden="true"
			/>
		);
	return (
		<Phone
			className={className}
			aria-hidden="true"
		/>
	);
}

function contactHref(contact: Listing['contacts'][number]): string {
	switch (contact.kind) {
		case 'email':
			return `mailto:${contact.value}`;
		case 'website':
			return websiteHref(contact.value);
		case 'whatsapp':
			return whatsappHref(contact.value);
		default:
			return telHref(contact.value);
	}
}

function contactDisplay(contact: Listing['contacts'][number]): string {
	if (contact.kind === 'website') return websiteLabel(contact.value);
	return contact.value;
}

function ListingResultCard({ listing }: { listing: Listing }) {
	const hoursLines = formatOpeningHoursLines(listing.openingHours);
	const contacts = listing.contacts ?? [];
	const hasContactInfo =
		Boolean(listing.address) || hoursLines.length > 0 || contacts.length > 0;

	return (
		<article>
			<div className="space-y-8">
				<div className="space-y-3">
					{listing.type ? (
						<h3 className="font-heading text-2xl font-semibold leading-snug text-[#333333]">
							{listing.type}
						</h3>
					) : null}
					<p className="font-heading text-xl font-thin  leading-snug text-[#333333]">
						{listing.name}
					</p>
				</div>

				{/* <hr className="border-[#b8a99a]" /> */}

				{listing.notes ? (
					<p className="font-sans text-base leading-loose text-[#333333]">
						{listing.notes}
					</p>
				) : null}

				{hasContactInfo ? (
					<div className="space-y-3">
						{listing.address ? (
							<p className="font-sans flex items-start gap-2 text-base leading-snug text-[#333333]">
								<span className="inline-flex h-[1lh] shrink-0 items-center">
									<MapPin
										className="size-4 text-[#7A5A32]"
										aria-hidden="true"
									/>
								</span>
								<span>{listing.address}</span>
							</p>
						) : null}

						{hoursLines.length > 0 ? (
							<div className="font-sans flex items-start gap-2 text-base leading-snug text-[#333333]">
								<span className="inline-flex h-[1lh] shrink-0 items-center">
									<Clock
										className="size-4 text-[#7A5A32]"
										aria-hidden="true"
									/>
								</span>
								<div className="min-w-0 space-y-1.5">
									{hoursLines.map(line => (
										<p key={line}>{line}</p>
									))}
								</div>
							</div>
						) : null}

						{contacts.length > 0 ? (
							<ul className="space-y-2">
								{contacts.map((contact, index) => {
									const isExternal =
										contact.kind === 'website' || contact.kind === 'whatsapp';
									const label = contact.label?.trim();
									return (
										<li
											key={`${contact.kind}-${contact.value}-${index}`}
											className="font-sans flex items-center gap-2 py-1 text-base leading-none text-[#333333]"
										>
											<ContactIcon kind={contact.kind} />
											<a
												href={contactHref(contact)}
												{...(isExternal
													? { target: '_blank', rel: 'noopener noreferrer' }
													: {})}
												className="underline-offset-2 hover:underline"
											>
												{label
													? `${label}: ${contactDisplay(contact)}`
													: contact.kind === 'whatsapp' ||
													  contact.kind === 'mobile'
													? `${
															CONTACT_KIND_LABELS[contact.kind]
													  }: ${contactDisplay(contact)}`
													: contactDisplay(contact)}
											</a>
										</li>
									);
								})}
							</ul>
						) : null}
					</div>
				) : null}

				{/* {hasContactInfo ? <hr className="border-[#b8a99a]" /> : null} */}

				{listing.sourceUrl ? (
					<p>
						<a
							href={listing.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="font-sans inline-flex items-center gap-2 rounded-[2px] border border-[#3d2a16] px-3.5 py-2 text-sm font-medium text-[#3d2a16] transition-colors duration-200 ease-in-out  hover:bg-[#3d2a16] hover:text-[#f7f2ec]"
						>
							<MapIcon
								className="size-4 shrink-0"
								aria-hidden="true"
							/>
							Open in Google Maps
						</a>
					</p>
				) : null}
			</div>
		</article>
	);
}

export default function ListingsBrowse(_props: { caption?: string | null }) {
	const pathname = usePathname();
	const category = categoryFromPathname(pathname);

	const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
	const [listings, setListings] = useState<Listing[]>([]);
	const [aliasMap, setAliasMap] = useState<Map<string, string[]>>(
		() => new Map()
	);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [query, setQuery] = useState('');
	const [activeTags, setActiveTags] = useState<string[]>([]);
	const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(
		null
	);
	const [highlightedPlaceName, setHighlightedPlaceName] = useState<
		string | null
	>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	const deferredQuery = useDeferredValue(query);
	const rootRef = useRef<HTMLDivElement>(null);
	// Non-sticky sentinel: scrollIntoView on the sticky bar is a no-op while it is
	// already stuck at the top of the viewport, which is exactly when we need to scroll.
	const scrollAnchorRef = useRef<HTMLDivElement>(null);
	const pendingScrollToSearchRef = useRef(false);
	const inputId = useId();

	function requestScrollToSearch() {
		pendingScrollToSearchRef.current = true;
	}

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
						error instanceof Error ? error.message : 'Could not load listings.'
					);
				}
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [authStatus, category]);

	const suggestions = useMemo(
		() => suggest(deferredQuery, listings, activeTags, aliasMap),
		[deferredQuery, listings, activeTags, aliasMap]
	);

	const results = useMemo(() => {
		if (selectedPlaceName) {
			return listings.filter(listing => listing.name === selectedPlaceName);
		}

		if (activeTags.length === 0 && !deferredQuery.trim()) {
			return listings;
		}

		return filterListings(listings, activeTags, deferredQuery, aliasMap);
	}, [listings, activeTags, deferredQuery, selectedPlaceName, aliasMap]);

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

	const isFiltered =
		activeTags.length > 0 ||
		Boolean(deferredQuery.trim()) ||
		Boolean(selectedPlaceName);

	useEffect(() => {
		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setPanelOpen(false);
			}
		};

		document.addEventListener('mousedown', onPointerDown);
		return () => document.removeEventListener('mousedown', onPointerDown);
	}, []);

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
		setSelectedPlaceName(null);
		setPanelOpen(false);
	}

	function removeTag(tag: string) {
		setActiveTags(prev =>
			prev.filter(t => t.toLowerCase() !== tag.toLowerCase())
		);
		setSelectedPlaceName(null);
	}

	function selectPlace(listing: Listing) {
		requestScrollToSearch();
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
		const next = pathname || '/place';
		return (
			<section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
				<div className="mx-auto max-w-[1400px]">
					<div className="border border-[#d9cbb8] bg-[#f7f2ec] px-6 py-10 text-center sm:px-10">
						<h2 className="font-heading text-2xl text-[#805b32]">
							Members places map
						</h2>
						<p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#57422a]">
							Local listings and map pins are available after you sign in. Ask
							an admin for an invitation if you do not have an account yet.
						</p>
						<Link
							href={`/sign-in?next=${encodeURIComponent(next)}`}
							className="mt-6 inline-flex h-10 items-center rounded-[2px] border border-[#634627] bg-[#805b32] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1f2d22]"
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

			<div
				id="listings-browse-search"
				ref={scrollAnchorRef}
				className="h-0 scroll-mt-0"
				aria-hidden="true"
			/>
			<div
				ref={rootRef}
				className="sticky top-0 z-40 w-full bg-[#eeeae4] px-4 py-5 sm:px-6 lg:px-8"
			>
				<div className="relative mx-auto w-full max-w-[33vw]">
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
						<div className="absolute z-50 mt-1 w-full border border-[#b8a99a] bg-white shadow-sm">
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

					{!isFiltered ? (
						<p className="font-heading mt-3 text-center text-sm text-[#666666]">
							Search by tag or place name
							{mapLocations.length === 0
								? ' · Map pins appear for places that have coordinates (more after geocoding).'
								: null}
						</p>
					) : null}
				</div>
			</div>

			<div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
					{/* Map — first on mobile, right column on desktop */}
					<div className="order-1 self-start lg:sticky lg:top-[146px] h-fit  lg:order-2 pt-5">
						<LocationsMap
							locations={mapLocations}
							selectedName={selectedPlaceName}
							highlightedName={highlightedPlaceName}
							onSelect={listing => selectPlace(listing)}
							onClearSelect={() => setSelectedPlaceName(null)}
						/>
					</div>

					{/* List — second on mobile, left column on desktop */}
					<div className="relative order-2 [overflow-anchor:none] lg:order-1 pt-5">
						{isFiltered && results.length === 0 ? (
							<p className="font-heading text-base text-[#666666]">
								No places match your search.
							</p>
						) : null}

						{results.length > 0 ? (
							<div>
								<p className="font-heading mb-6 text-sm text-[#666666]">
									{results.length} {results.length === 1 ? 'place' : 'places'}
									{category
										? ` in ${CATEGORY_LABELS[category] ?? category}`
										: ''}
								</p>
								{results.map((listing, index) => (
									<div key={`${listing.category}-${listing.name}`}>
										<div
											className={`-mx-3 rounded-3xl px-3 py-8 transition-colors duration-200 ease-in-out ${
												highlightedPlaceName === listing.name
													? 'bg-[#f7f3ec]'
													: 'bg-transparent'
											}`}
											onMouseEnter={() => setHighlightedPlaceName(listing.name)}
											onMouseLeave={() => setHighlightedPlaceName(null)}
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
			</div>
		</section>
	);
}
