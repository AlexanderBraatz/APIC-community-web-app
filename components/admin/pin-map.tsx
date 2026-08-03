'use client';

import {
	APIProvider,
	Map,
	Marker,
	useMap
} from '@vis.gl/react-google-maps';
import { useEffect } from 'react';

const DEFAULT_CENTER = { lat: 43.5419, lng: 10.9706 };
const DEFAULT_ZOOM = 12;

type PinMapProps = {
	lat: number | null;
	lng: number | null;
	onChange: (coords: { lat: number; lng: number }) => void;
	className?: string;
};

function ClickToPin({
	lat,
	lng,
	onChange
}: {
	lat: number | null;
	lng: number | null;
	onChange: (coords: { lat: number; lng: number }) => void;
}) {
	const map = useMap();

	useEffect(() => {
		if (!map) return;

		const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
			const position = event.latLng;
			if (!position) return;
			onChange({ lat: position.lat(), lng: position.lng() });
		});

		return () => {
			listener.remove();
		};
	}, [map, onChange]);

	useEffect(() => {
		if (!map || lat === null || lng === null) return;
		map.panTo({ lat, lng });
		if ((map.getZoom() ?? DEFAULT_ZOOM) < 13) {
			map.setZoom(14);
		}
	}, [map, lat, lng]);

	return null;
}

export default function AdminPinMap({ lat, lng, onChange, className }: PinMapProps) {
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
	const hasPin = lat !== null && lng !== null;

	if (!apiKey) {
		return (
			<div
				className={`flex aspect-[2/1] w-full items-center justify-center border border-[#b8a99a]/40 bg-[#e8e4dc] px-4 text-center text-sm text-[#666] ${className ?? ''}`}
			>
				Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to place pins on the map.
			</div>
		);
	}

	return (
		<div
			className={`overflow-hidden border border-[#b8a99a]/40 bg-[#e8e4dc] ${className ?? ''}`}
		>
			<APIProvider apiKey={apiKey}>
				<Map
					className="aspect-[2/1] w-full"
					defaultCenter={
						hasPin ? { lat: lat!, lng: lng! } : DEFAULT_CENTER
					}
					defaultZoom={hasPin ? 14 : DEFAULT_ZOOM}
					gestureHandling="greedy"
					mapTypeControl={false}
					streetViewControl={false}
					fullscreenControl={false}
					reuseMaps
				>
					<ClickToPin lat={lat} lng={lng} onChange={onChange} />
					{hasPin ? (
						<Marker
							position={{ lat: lat!, lng: lng! }}
							draggable
							onDragEnd={event => {
								const position = event.latLng;
								if (!position) return;
								onChange({ lat: position.lat(), lng: position.lng() });
							}}
						/>
					) : null}
				</Map>
			</APIProvider>
			<p className="border-t border-[#b8a99a]/40 bg-white px-3 py-2 text-xs text-[#666]">
				Click the map to place a pin, or drag the marker. Confirm coords before
				saving the listing.
			</p>
		</div>
	);
}
