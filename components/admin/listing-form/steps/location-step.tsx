'use client';

import { useState } from 'react';
import AdminPinMap from '@/components/admin/pin-map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LocationStepProps = {
	address: string;
	sourceUrl: string;
	lat: number | null;
	lng: number | null;
	latInput: string;
	lngInput: string;
	onAddressChange: (value: string) => void;
	onSourceUrlChange: (value: string) => void;
	onLatInputChange: (value: string) => void;
	onLngInputChange: (value: string) => void;
	onClearPin: () => void;
	onPinChange: (coords: { lat: number; lng: number }) => void;
};

export default function LocationStep({
	address,
	sourceUrl,
	lat,
	lng,
	latInput,
	lngInput,
	onAddressChange,
	onSourceUrlChange,
	onLatInputChange,
	onLngInputChange,
	onClearPin,
	onPinChange
}: LocationStepProps) {
	const pinSet = lat !== null && lng !== null;
	const [adjustingPin, setAdjustingPin] = useState(false);
	const pinEditable = !pinSet || adjustingPin;

	function handleClearPin() {
		setAdjustingPin(false);
		onClearPin();
	}

	function handleDoneAdjusting() {
		setAdjustingPin(false);
	}

	function handleLatFieldChange(value: string) {
		// Keep fields unlocked if typing places a pin for the first time.
		if (!pinSet) setAdjustingPin(true);
		onLatInputChange(value);
	}

	function handleLngFieldChange(value: string) {
		if (!pinSet) setAdjustingPin(true);
		onLngInputChange(value);
	}

	function handleMapPinChange(coords: { lat: number; lng: number }) {
		// First placement via map locks immediately; stay unlocked while Adjusting.
		if (!pinSet) setAdjustingPin(false);
		onPinChange(coords);
	}

	return (
		<section className="space-y-6">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Location</h3>
				<p className="mt-1 text-xs text-[#888]">
					Confirm the address, map pin, and Google Maps link.
				</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="step-address">Address</Label>
				<Input
					id="step-address"
					value={address}
					onChange={e => onAddressChange(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="step-source-url">Google Maps Link</Label>
				<Input
					id="step-source-url"
					type="url"
					value={sourceUrl}
					onChange={e => onSourceUrlChange(e.target.value)}
				/>
			</div>

			<div className="space-y-3">
				<div>
					<h4 className="text-sm font-medium text-[#444]">Map pin</h4>
					<p className="text-xs text-[#888]">
						{pinSet && !adjustingPin
							? 'Pin locked — pan and zoom freely without moving it. Adjust only if needed.'
							: pinEditable && pinSet
							? 'Editing pin — change coordinates, click the map, or drag the marker, then finish when done.'
							: 'Enter latitude and longitude, or click the map to place a pin.'}
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="step-latitude">Latitude</Label>
						<Input
							id="step-latitude"
							value={latInput}
							onChange={e => handleLatFieldChange(e.target.value)}
							placeholder="43.54844"
							inputMode="decimal"
							disabled={!pinEditable}
							readOnly={!pinEditable}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="step-longitude">Longitude</Label>
						<Input
							id="step-longitude"
							value={lngInput}
							onChange={e => handleLngFieldChange(e.target.value)}
							placeholder="10.85667"
							inputMode="decimal"
							disabled={!pinEditable}
							readOnly={!pinEditable}
						/>
					</div>
				</div>
				{pinSet ? (
					<div className="flex flex-wrap gap-2">
						{adjustingPin ? (
							<Button
								type="button"
								variant="secondary"
								onClick={handleDoneAdjusting}
							>
								Lock Pin
							</Button>
						) : (
							<Button
								type="button"
								variant="secondary"
								onClick={() => setAdjustingPin(true)}
							>
								Adjust pin
							</Button>
						)}
						<Button
							type="button"
							variant="secondary"
							onClick={handleClearPin}
						>
							Clear pin
						</Button>
					</div>
				) : null}
				<AdminPinMap
					lat={lat}
					lng={lng}
					onChange={handleMapPinChange}
					interactive={pinEditable}
				/>
			</div>
		</section>
	);
}
