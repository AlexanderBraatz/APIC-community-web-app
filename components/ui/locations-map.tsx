'use client';

import {
	listingHasCoords,
	type Listing,
	type ListingWithCoords
} from '@/lib/listings-search';
import {
	APIProvider,
	InfoWindow,
	Map,
	Marker,
	useMap
} from '@vis.gl/react-google-maps';
import { cn } from '@/lib/utils';
import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';

/** Castelfalfi — default map center and fixed landmark pin. */
const CASTELFALFI = { lat: 43.548442, lng: 10.856672 };
const DEFAULT_ZOOM = 12;
/** Padding (px) so markers are not flush against the map edge after fitBounds. */
const FIT_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };
/** Cap zoom after fitBounds so single/nearby pins do not over-zoom. */
const MAX_FIT_ZOOM = 15;
/** Relative inset of current bounds used to decide if points are already "comfortably" visible. */
const VISIBILITY_PAD_RATIO = 0.08;
/** Degrees tolerance when comparing successive target bounds. */
const BOUNDS_EPSILON = 1e-5;
/** Matches site accent `#7A5A32` (golden brown). */
const CASTELFALFI_PIN_COLOR = '#7A5A32';

const CASTELFALFI_ICON = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
		<path fill="${CASTELFALFI_PIN_COLOR}" stroke="#f7f3ec" stroke-width="1.5"
			d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z"/>
		<circle fill="#f7f3ec" cx="18" cy="18" r="6"/>
	</svg>`
)}`;

/**
 * Soft clay / Google-contrast map: cream land, sage water, olive parks,
 * ivory roads, gold highways, lighter natural terrain, darker country borders.
 */
const MAP_STYLES = [
	{ elementType: 'geometry', stylers: [{ color: '#ebe6dc' }] },
	{ elementType: 'labels.text.fill', stylers: [{ color: '#5d4a35' }] },
	{ elementType: 'labels.text.stroke', stylers: [{ color: '#f7f3ec' }] },
	{
		featureType: 'administrative',
		elementType: 'geometry.stroke',
		stylers: [{ color: '#c8b8a4' }]
	},
	{
		featureType: 'administrative.country',
		elementType: 'geometry.stroke',
		stylers: [{ color: '#8a7a62' }, { weight: 1.2 }]
	},
	{
		featureType: 'administrative.land_parcel',
		elementType: 'labels',
		stylers: [{ visibility: 'off' }]
	},
	{
		featureType: 'landscape',
		elementType: 'geometry',
		stylers: [{ color: '#ebe6dc' }]
	},
	{
		featureType: 'landscape.man_made',
		elementType: 'geometry',
		stylers: [{ color: '#e4ddd2' }]
	},
	{
		featureType: 'landscape.natural',
		elementType: 'geometry',
		stylers: [{ color: '#efe9df' }]
	},
	{
		featureType: 'landscape.natural.landcover',
		elementType: 'geometry',
		stylers: [{ color: '#f2ede4' }]
	},
	{
		featureType: 'landscape.natural.terrain',
		elementType: 'geometry',
		stylers: [{ color: '#f7f3ec' }]
	},
	{
		featureType: 'poi',
		elementType: 'geometry',
		stylers: [{ color: '#e0d8cc' }]
	},
	{
		featureType: 'poi',
		elementType: 'labels.text.fill',
		stylers: [{ color: '#7a6548' }]
	},
	{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
	{
		featureType: 'poi.park',
		elementType: 'geometry',
		stylers: [{ color: '#b4c49a' }]
	},
	{
		featureType: 'poi.park',
		elementType: 'labels.text.fill',
		stylers: [{ color: '#5a6548' }]
	},
	{
		featureType: 'road',
		elementType: 'geometry',
		stylers: [{ color: '#faf7f0' }]
	},
	{
		featureType: 'road',
		elementType: 'geometry.stroke',
		stylers: [{ color: '#d4c8b8' }]
	},
	{
		featureType: 'road',
		elementType: 'labels.text.fill',
		stylers: [{ color: '#7a6548' }]
	},
	{
		featureType: 'road.highway',
		elementType: 'geometry',
		stylers: [{ color: '#e8c878' }]
	},
	{
		featureType: 'road.highway',
		elementType: 'geometry.stroke',
		stylers: [{ color: '#c4a04a' }]
	},
	{ featureType: 'transit', stylers: [{ visibility: 'off' }] },
	{
		featureType: 'water',
		elementType: 'geometry',
		stylers: [{ color: '#c5cfc8' }]
	},
	{
		featureType: 'water',
		elementType: 'labels.text.fill',
		stylers: [{ color: '#6a7a72' }]
	}
];

type LocationsMapProps = {
	/** Listings in the current data shape. Only entries with lat/lng become pins. */
	locations: Listing[];
	/** When set, opens the info window for the matching listing name. */
	selectedName?: string | null;
	/** Temporary highlight from list hover — opens info window without filtering. */
	highlightedName?: string | null;
	/** When true, keep the first pin’s tooltip open without hover/selection (e.g. blog map). */
	showTooltipsByDefault?: boolean;
	onSelect?: (listing: ListingWithCoords) => void;
	onClearSelect?: () => void;
	/** When true, show the bottom-right control to clear map focus. */
	showClearFocus?: boolean;
	onClearFocus?: () => void;
	className?: string;
	style?: CSSProperties;
	/** When this value changes, trigger a Google Maps container resize. */
	layoutKey?: string | number;
};

function pinKey(listing: ListingWithCoords) {
	return `${listing.category}-${listing.name}-${listing.lat}-${listing.lng}`;
}

type LatLngLiteral = { lat: number; lng: number };

type BoundsCorners = {
	south: number;
	west: number;
	north: number;
	east: number;
};

function pinSignature(pins: ListingWithCoords[]) {
	return pins
		.map(pin => `${pin.lat},${pin.lng}`)
		.sort()
		.join('|');
}

function buildTargetBounds(pins: ListingWithCoords[]) {
	const bounds = new google.maps.LatLngBounds();
	bounds.extend(CASTELFALFI);
	for (const pin of pins) {
		bounds.extend({ lat: pin.lat, lng: pin.lng });
	}
	return bounds;
}

function cornersFromBounds(bounds: google.maps.LatLngBounds): BoundsCorners {
	const sw = bounds.getSouthWest();
	const ne = bounds.getNorthEast();
	return {
		south: sw.lat(),
		west: sw.lng(),
		north: ne.lat(),
		east: ne.lng()
	};
}

function boundsNearlyEqual(a: BoundsCorners, b: BoundsCorners) {
	return (
		Math.abs(a.south - b.south) < BOUNDS_EPSILON &&
		Math.abs(a.west - b.west) < BOUNDS_EPSILON &&
		Math.abs(a.north - b.north) < BOUNDS_EPSILON &&
		Math.abs(a.east - b.east) < BOUNDS_EPSILON
	);
}

function targetPoints(pins: ListingWithCoords[]): LatLngLiteral[] {
	return [CASTELFALFI, ...pins.map(pin => ({ lat: pin.lat, lng: pin.lng }))];
}

/** True when every point sits inside the current view inset by VISIBILITY_PAD_RATIO. */
function allPointsComfortablyVisible(
	mapBounds: google.maps.LatLngBounds,
	points: LatLngLiteral[]
) {
	const sw = mapBounds.getSouthWest();
	const ne = mapBounds.getNorthEast();
	const latPad = (ne.lat() - sw.lat()) * VISIBILITY_PAD_RATIO;
	const lngPad = (ne.lng() - sw.lng()) * VISIBILITY_PAD_RATIO;
	const south = sw.lat() + latPad;
	const north = ne.lat() - latPad;
	const west = sw.lng() + lngPad;
	const east = ne.lng() - lngPad;

	return points.every(
		point =>
			point.lat >= south &&
			point.lat <= north &&
			point.lng >= west &&
			point.lng <= east
	);
}

/**
 * Fits the viewport to Castelfalfi + active listing pins whenever the
 * displayed pin set changes (filter, tag, select, clear). Marker rendering
 * stays in MapPins.
 */
function FitBoundsToPins({ pins }: { pins: ListingWithCoords[] }) {
	const map = useMap();
	const lastFitCornersRef = useRef<BoundsCorners | null>(null);
	const mappedInstanceRef = useRef<ReturnType<typeof useMap>>(null);
	// Stable across hover/selection noise: only lat/lng matter for fitting.
	const signature = pinSignature(pins);

	useEffect(() => {
		if (!map) return;

		if (mappedInstanceRef.current !== map) {
			mappedInstanceRef.current = map;
			lastFitCornersRef.current = null;
		}

		const bounds = buildTargetBounds(pins);
		const nextCorners = cornersFromBounds(bounds);
		const points = targetPoints(pins);

		const currentBounds = map.getBounds();
		const alreadyVisible =
			Boolean(currentBounds) &&
			allPointsComfortablyVisible(currentBounds!, points);
		const sameAsLastFit =
			lastFitCornersRef.current !== null &&
			boundsNearlyEqual(lastFitCornersRef.current, nextCorners);

		// Only skip when the pin-set bounds are unchanged *and* still on screen.
		// Always refit when the set shrinks or grows (tag filter, pin select, clear)
		// so the map zooms to the new subset / full set even if pins were already visible.
		if (sameAsLastFit && alreadyVisible) {
			return;
		}

		map.fitBounds(bounds, FIT_PADDING);
		lastFitCornersRef.current = nextCorners;

		const idleListener = map.addListener('idle', () => {
			const zoom = map.getZoom();
			if (zoom != null && zoom > MAX_FIT_ZOOM) {
				map.setZoom(MAX_FIT_ZOOM);
			}
			idleListener.remove();
		});

		return () => {
			idleListener.remove();
		};
	}, [map, signature, pins]);

	return null;
}

/** Nudges Google Maps after the container size changes (e.g. mobile drag-resize). */
function MapResizeOnLayoutKey({ layoutKey }: { layoutKey?: string | number }) {
	const map = useMap();

	useEffect(() => {
		if (!map || layoutKey == null) return;
		google.maps.event.trigger(map, 'resize');
	}, [map, layoutKey]);

	return null;
}

function CastelfalfiPin() {
	const [hovered, setHovered] = useState(false);

	return (
		<>
			<Marker
				position={CASTELFALFI}
				title="Castelfalfi"
				icon={CASTELFALFI_ICON}
				zIndex={1000}
				onMouseOver={() => setHovered(true)}
				onMouseOut={() => setHovered(false)}
			/>
			{hovered ? (
				<InfoWindow
					position={CASTELFALFI}
					pixelOffset={[0, -44]}
					disableAutoPan
					headerDisabled
				>
					<p className="font-heading text-xs font-medium text-[#333333] sm:text-sm">
						Castelfalfi
					</p>
				</InfoWindow>
			) : null}
		</>
	);
}

function MapPins({
	pins,
	selectedName,
	highlightedName,
	showTooltipsByDefault = false,
	onSelect,
	onClearSelect
}: {
	pins: ListingWithCoords[];
	selectedName?: string | null;
	highlightedName?: string | null;
	showTooltipsByDefault?: boolean;
	onSelect?: (listing: ListingWithCoords) => void;
	onClearSelect?: () => void;
}) {
	const [hoveredName, setHoveredName] = useState<string | null>(null);

	const activePin = useMemo(() => {
		const defaultName =
			showTooltipsByDefault && pins.length > 0 ? pins[0].name : null;
		const nameToShow =
			highlightedName || selectedName || hoveredName || defaultName;
		if (!nameToShow) return null;
		return pins.find(pin => pin.name === nameToShow) ?? null;
	}, [pins, highlightedName, selectedName, hoveredName, showTooltipsByDefault]);

	const activeKey = activePin ? pinKey(activePin) : null;
	// Selection keeps the closable info window; list/map hover uses a lean tooltip.
	const isSelectedInfo =
		Boolean(selectedName) &&
		activePin?.name === selectedName &&
		!highlightedName;

	return (
		<>
			<CastelfalfiPin />
			{pins.map(pin => {
				const key = pinKey(pin);
				const isActive = key === activeKey;
				return (
					<Marker
						key={key}
						position={{ lat: pin.lat, lng: pin.lng }}
						title={pin.name}
						zIndex={isActive ? 100 : 1}
						onClick={() => onSelect?.(pin)}
						onMouseOver={() => setHoveredName(pin.name)}
						onMouseOut={() =>
							setHoveredName(prev => (prev === pin.name ? null : prev))
						}
					/>
				);
			})}
			{activePin ? (
				<InfoWindow
					position={{ lat: activePin.lat, lng: activePin.lng }}
					pixelOffset={[0, -36]}
					disableAutoPan={!isSelectedInfo}
					headerDisabled={!isSelectedInfo}
					onCloseClick={() => onClearSelect?.()}
				>
					<div className="font-heading max-w-40 px-0.5 py-0.5 text-[#333333] sm:max-w-56">
						<p className="text-xs font-medium sm:text-sm">{activePin.name}</p>
						{activePin.type ? (
							<p className="mt-0.5 text-[11px] text-[#666666] sm:text-xs">
								{activePin.type}
							</p>
						) : null}
					</div>
				</InfoWindow>
			) : null}
		</>
	);
}

export default function LocationsMap({
	locations,
	selectedName = null,
	highlightedName = null,
	showTooltipsByDefault = false,
	onSelect,
	onClearSelect,
	showClearFocus = false,
	onClearFocus,
	className,
	style,
	layoutKey
}: LocationsMapProps) {
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
	const pins = useMemo(() => locations.filter(listingHasCoords), [locations]);
	// Touch devices expect pinch/pan; hide zoom/fullscreen chrome below lg.
	const [showMapChrome, setShowMapChrome] = useState(false);

	useEffect(() => {
		const media = window.matchMedia('(min-width: 1024px)');
		const sync = () => setShowMapChrome(media.matches);
		sync();
		media.addEventListener('change', sync);
		return () => media.removeEventListener('change', sync);
	}, []);

	if (!apiKey) {
		return (
			<div
				className={`flex w-full items-center justify-center border border-[#b8a99a]/40 bg-[#e8e4dc] px-6 text-center ${
					className ?? 'aspect-[2/1]'
				}`}
				style={style}
				role="status"
			>
				<p className="font-heading max-w-md text-sm leading-relaxed text-[#666666]">
					Add{' '}
					<code className="rounded-sm bg-white/70 px-1.5 py-0.5 text-[#333333]">
						NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
					</code>{' '}
					to your environment to show the map.
				</p>
			</div>
		);
	}

	return (
		<div
			className={cn(
				'relative aspect-[1.618/1] w-full overflow-hidden rounded-3xl border border-[#b8a99a]/40 bg-[#e8e4dc] lg:aspect-auto lg:h-[calc(100vh-186px)]',
				className
			)}
			style={style}
		>
			<APIProvider apiKey={apiKey}>
				<Map
					className="h-full w-full"
					defaultCenter={CASTELFALFI}
					defaultZoom={DEFAULT_ZOOM}
					gestureHandling="greedy"
					zoomControl={showMapChrome}
					cameraControl={false}
					mapTypeControl={false}
					streetViewControl={false}
					fullscreenControl={showMapChrome}
					styles={MAP_STYLES}
					reuseMaps
				>
					<MapResizeOnLayoutKey layoutKey={layoutKey} />
					<FitBoundsToPins pins={pins} />
					<MapPins
						pins={pins}
						selectedName={selectedName}
						highlightedName={highlightedName}
						showTooltipsByDefault={showTooltipsByDefault}
						onSelect={onSelect}
						onClearSelect={onClearSelect}
					/>
				</Map>
			</APIProvider>
			{showClearFocus ? (
				<button
					type="button"
					onClick={() => onClearFocus?.()}
					className="font-heading absolute right-3 bottom-4 z-10 rounded-[2px] border border-[#b8a99a] bg-white/95 px-3 py-2 text-sm text-[#333333] shadow-sm transition-colors hover:border-[#7A5A32] hover:bg-[#f7f3ec] lg:right-15 lg:bottom-6"
					aria-label="Show all places on map"
				>
					Show all
				</button>
			) : null}
		</div>
	);
}
