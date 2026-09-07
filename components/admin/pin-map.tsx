'use client';

import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';

const DEFAULT_CENTER = { lat: 43.548442, lng: 10.856672 };
const DEFAULT_ZOOM = 12;

type PinMapProps = {
	lat: number | null;
	lng: number | null;
	onChange: (coords: { lat: number; lng: number }) => void;
	/** When false, map is view-only: no click-to-pin and marker is not draggable. */
	interactive?: boolean;
	className?: string;
};

function ClickToPin({
	lat,
	lng,
	onChange,
	interactive
}: {
	lat: number | null;
	lng: number | null;
	onChange: (coords: { lat: number; lng: number }) => void;
	interactive: boolean;
}) {
	const map = useMap();

	useEffect(() => {
		if (!map || !interactive) return;

		const listener = map.addListener(
			'click',
			(event: google.maps.MapMouseEvent) => {
				const position = event.latLng;
				if (!position) return;
				onChange({ lat: position.lat(), lng: position.lng() });
			}
		);

		return () => {
			listener.remove();
		};
	}, [map, onChange, interactive]);

	useEffect(() => {
		if (!map || lat === null || lng === null) return;
		map.panTo({ lat, lng });
		if ((map.getZoom() ?? DEFAULT_ZOOM) < 13) {
			map.setZoom(14);
		}
	}, [map, lat, lng]);

	return null;
}

export default function AdminPinMap({
	lat,
	lng,
	onChange,
	interactive = true,
	className
}: PinMapProps) {
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
	const hasPin = lat !== null && lng !== null;

	if (!apiKey) {
		return (
			<div
				className={`flex aspect-[2/1] w-full items-center justify-center border border-[#b8a99a]/40 bg-[#e8e4dc] px-4 text-center text-sm text-[#666] ${
					className ?? ''
				}`}
			>
				Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to place pins on the map.
			</div>
		);
	}

	const footerHint = !hasPin
		? 'Click the map to place a pin, or enter coordinates above.'
		: interactive
			? 'Click the map to move the pin, or drag the marker.'
			: 'Pin is locked. Use Adjust pin to move it.';

	return (
		<div
			className={`overflow-hidden border border-[#b8a99a]/40 bg-[#e8e4dc] ${
				className ?? ''
			}`}
		>
			<div className="relative">
				<APIProvider apiKey={apiKey}>
					<Map
						className="aspect-[2/1] w-full"
						defaultCenter={hasPin ? { lat: lat!, lng: lng! } : DEFAULT_CENTER}
						defaultZoom={hasPin ? 14 : DEFAULT_ZOOM}
						gestureHandling="greedy"
						mapTypeControl={false}
						streetViewControl={false}
						fullscreenControl={false}
						reuseMaps
					>
						<ClickToPin
							lat={lat}
							lng={lng}
							onChange={onChange}
							interactive={interactive}
						/>
						{hasPin ? (
							<Marker
								position={{ lat: lat!, lng: lng! }}
								draggable={interactive}
								onDragEnd={event => {
									if (!interactive) return;
									const position = event.latLng;
									if (!position) return;
									onChange({ lat: position.lat(), lng: position.lng() });
								}}
							/>
						) : null}
					</Map>
				</APIProvider>
				{!hasPin ? (
					<div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[5%] px-4">
						<div className="max-w-sm space-y-2 border border-[#b8a99a]/60 bg-white/90 px-4 py-3 text-center text-sm text-[#444] shadow-sm">
							<p>
								No location selected yet. Use this map or the fields above to
								set a specific location for this listing.
							</p>
							<p className="font-bold">
								Click the map to place a pin, or drag the marker.
							</p>
						</div>
					</div>
				) : null}
			</div>
			<p className="border-t border-[#b8a99a]/40 bg-white px-3 py-2 text-xs text-[#666]">
				{footerHint}
			</p>
		</div>
	);
}
