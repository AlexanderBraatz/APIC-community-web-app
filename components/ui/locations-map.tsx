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
	Marker
} from '@vis.gl/react-google-maps';
import { useEffect, useMemo, useState } from 'react';

/** Castelfalfi — default map center and fixed landmark pin. */
const CASTELFALFI = { lat: 43.548442, lng: 10.856672 };
const DEFAULT_ZOOM = 12;
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
	onSelect?: (listing: ListingWithCoords) => void;
	className?: string;
};

function pinKey(listing: ListingWithCoords) {
	return `${listing.category}-${listing.name}-${listing.lat}-${listing.lng}`;
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
	onSelect
}: {
	pins: ListingWithCoords[];
	selectedName?: string | null;
	onSelect?: (listing: ListingWithCoords) => void;
}) {
	const [activeKey, setActiveKey] = useState<string | null>(null);

	const activePin = useMemo(
		() => pins.find(pin => pinKey(pin) === activeKey) ?? null,
		[pins, activeKey]
	);

	useEffect(() => {
		if (!selectedName) return;
		const match = pins.find(pin => pin.name === selectedName);
		if (match) setActiveKey(pinKey(match));
	}, [selectedName, pins]);

	useEffect(() => {
		if (activeKey && !pins.some(pin => pinKey(pin) === activeKey)) {
			setActiveKey(null);
		}
	}, [pins, activeKey]);

	return (
		<>
			<CastelfalfiPin />
			{pins.map(pin => {
				const key = pinKey(pin);
				return (
					<Marker
						key={key}
						position={{ lat: pin.lat, lng: pin.lng }}
						title={pin.name}
						onClick={() => {
							setActiveKey(key);
							onSelect?.(pin);
						}}
					/>
				);
			})}
			{activePin ? (
				<InfoWindow
					position={{ lat: activePin.lat, lng: activePin.lng }}
					onCloseClick={() => setActiveKey(null)}
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
	onSelect,
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
					<MapPins
						pins={pins}
						selectedName={selectedName}
						onSelect={onSelect}
					/>
				</Map>
			</APIProvider>
		</div>
	);
}
