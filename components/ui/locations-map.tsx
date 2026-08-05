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
import { useEffect, useMemo, useState } from 'react';

/** Castel Falfi / Montaione area — used when no pins are available. */
const DEFAULT_CENTER = { lat: 43.5419, lng: 10.9706 };
const DEFAULT_ZOOM = 12;

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

function FitToPins({ pins }: { pins: ListingWithCoords[] }) {
	const map = useMap();

	useEffect(() => {
		if (!map || pins.length === 0) return;

		if (pins.length === 1) {
			map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
			map.setZoom(14);
			return;
		}

		const bounds = new google.maps.LatLngBounds();
		for (const pin of pins) {
			bounds.extend({ lat: pin.lat, lng: pin.lng });
		}
		map.fitBounds(bounds, 64);
	}, [map, pins]);

	return null;
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
			<FitToPins pins={pins} />
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
					defaultCenter={DEFAULT_CENTER}
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
