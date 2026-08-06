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
import { useEffect, useMemo, useRef, useState } from 'react';

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

type LocationsMapProps = {
	/** Listings in the current data shape. Only entries with lat/lng become pins. */
	locations: Listing[];
	/** When set, opens the info window for the matching listing name. */
	selectedName?: string | null;
	/** Temporary highlight from list hover — opens info window without filtering. */
	highlightedName?: string | null;
	onSelect?: (listing: ListingWithCoords) => void;
	onClearSelect?: () => void;
	className?: string;
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
 * Keeps the viewport fitted to Castelfalfi + active listing pins whenever
 * the displayed pin set changes. Marker rendering stays in MapPins.
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

		// Skip when the target is unchanged and still on screen, or when a new /
		// narrower pin set remains comfortably inside the current view.
		if (sameAsLastFit && alreadyVisible) {
			return;
		}
		if (alreadyVisible) {
			lastFitCornersRef.current = nextCorners;
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
					<p className="font-heading text-sm font-medium text-[#333333]">
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
	onSelect,
	onClearSelect
}: {
	pins: ListingWithCoords[];
	selectedName?: string | null;
	highlightedName?: string | null;
	onSelect?: (listing: ListingWithCoords) => void;
	onClearSelect?: () => void;
}) {
	const activePin = useMemo(() => {
		const nameToShow = highlightedName || selectedName || null;
		if (!nameToShow) return null;
		return pins.find(pin => pin.name === nameToShow) ?? null;
	}, [pins, highlightedName, selectedName]);

	const activeKey = activePin ? pinKey(activePin) : null;

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
					/>
				);
			})}
			{activePin ? (
				<InfoWindow
					position={{ lat: activePin.lat, lng: activePin.lng }}
					disableAutoPan={Boolean(highlightedName)}
					onCloseClick={() => onClearSelect?.()}
				>
					<div className="font-heading max-w-56 px-0.5 py-0.5 text-[#333333]">
						<p className="text-sm font-medium">{activePin.name}</p>
						{activePin.type ? (
							<p className="mt-0.5 text-xs text-[#666666]">{activePin.type}</p>
						) : null}
						{activePin.address ? (
							<p className="mt-1 text-xs leading-snug text-[#666666]">
								{activePin.address}
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
	onSelect,
	onClearSelect,
	className
}: LocationsMapProps) {
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
	const pins = useMemo(() => locations.filter(listingHasCoords), [locations]);

	if (!apiKey) {
		return (
			<div
				className={`flex w-full items-center justify-center border border-[#b8a99a]/40 bg-[#e8e4dc] px-6 text-center ${
					className ?? 'aspect-[2/1]'
				}`}
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
			className={`aspect-[1.618/1] w-full overflow-hidden rounded-sm border border-[#b8a99a]/40 bg-[#e8e4dc] lg:aspect-auto lg:h-[calc(100vh-186px)] ${
				className ?? ''
			}`}
		>
			<APIProvider apiKey={apiKey}>
				<Map
					className="h-full w-full"
					defaultCenter={CASTELFALFI}
					defaultZoom={DEFAULT_ZOOM}
					gestureHandling="greedy"
					mapTypeControl={false}
					streetViewControl={false}
					fullscreenControl={false}
					reuseMaps
				>
					<FitBoundsToPins pins={pins} />
					<MapPins
						pins={pins}
						selectedName={selectedName}
						highlightedName={highlightedName}
						onSelect={onSelect}
						onClearSelect={onClearSelect}
					/>
				</Map>
			</APIProvider>
		</div>
	);
}
