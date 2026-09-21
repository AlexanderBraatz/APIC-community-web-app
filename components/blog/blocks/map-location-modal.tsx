'use client';

import { useEffect, useState, useTransition } from 'react';
import GoogleStep from '@/components/admin/listing-form/steps/google-step';
import LocationStep from '@/components/admin/listing-form/steps/location-step';
import StepperNav from '@/components/admin/listing-form/stepper-nav';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import {
	upsertBlogMapLocation,
	type BlogMapLocation
} from '@/lib/blog/map-location-actions';
import type { PlaceAutofill } from '@/lib/listings/types';

const STEP_FIND = 0;
const STEP_LOCATION = 1;

const MAP_LOCATION_STEPS = [
	{ id: 'find', label: 'Find place' },
	{ id: 'location', label: 'Location' }
];

type MapLocationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	postId: string;
	initial: BlogMapLocation | null;
	onSaved: (location: BlogMapLocation) => void;
};

function parseCoordPair(
	latValue: string,
	lngValue: string
): { lat: number; lng: number } | null {
	const latTrimmed = latValue.trim();
	const lngTrimmed = lngValue.trim();
	if (!latTrimmed || !lngTrimmed) return null;
	const parsedLat = Number(latTrimmed);
	const parsedLng = Number(lngTrimmed);
	if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
	if (parsedLat < -90 || parsedLat > 90) return null;
	if (parsedLng < -180 || parsedLng > 180) return null;
	return { lat: parsedLat, lng: parsedLng };
}

export default function MapLocationModal({
	open,
	onOpenChange,
	postId,
	initial,
	onSaved
}: MapLocationModalProps) {
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [currentStep, setCurrentStep] = useState(
		initial ? STEP_LOCATION : STEP_FIND
	);

	const [address, setAddress] = useState(initial?.address ?? '');
	const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '');
	const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
	const [lng, setLng] = useState<number | null>(initial?.lng ?? null);
	const [latInput, setLatInput] = useState(
		initial?.lat != null ? String(initial.lat) : ''
	);
	const [lngInput, setLngInput] = useState(
		initial?.lng != null ? String(initial.lng) : ''
	);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setCurrentStep(initial ? STEP_LOCATION : STEP_FIND);
		setAddress(initial?.address ?? '');
		setSourceUrl(initial?.sourceUrl ?? '');
		setLat(initial?.lat ?? null);
		setLng(initial?.lng ?? null);
		setLatInput(initial?.lat != null ? String(initial.lat) : '');
		setLngInput(initial?.lng != null ? String(initial.lng) : '');
	}, [open, initial]);

	function setPin(nextLat: number, nextLng: number) {
		setLat(nextLat);
		setLng(nextLng);
		setLatInput(String(nextLat));
		setLngInput(String(nextLng));
	}

	function clearPin() {
		setLat(null);
		setLng(null);
		setLatInput('');
		setLngInput('');
	}

	function handleLatInputChange(value: string) {
		setLatInput(value);
		const coords = parseCoordPair(value, lngInput);
		if (coords) {
			setLat(coords.lat);
			setLng(coords.lng);
		}
	}

	function handleLngInputChange(value: string) {
		setLngInput(value);
		const coords = parseCoordPair(latInput, value);
		if (coords) {
			setLat(coords.lat);
			setLng(coords.lng);
		}
	}

	function applyPlaceAutofill(place: PlaceAutofill) {
		if (place.address) setAddress(place.address);
		if (place.sourceUrl) {
			setSourceUrl(prev => (prev.trim() ? prev : place.sourceUrl!));
		}
		if (place.lat !== null && place.lng !== null) {
			setPin(place.lat, place.lng);
		}
		setCurrentStep(STEP_LOCATION);
		setError(null);
	}

	function handleSave() {
		if (lat === null || lng === null) {
			setError('Set a map pin before saving.');
			return;
		}
		setError(null);
		startTransition(async () => {
			try {
				const saved = await upsertBlogMapLocation({
					postId,
					address: address.trim() || null,
					sourceUrl: sourceUrl.trim() || null,
					lat,
					lng
				});
				onSaved(saved);
				onOpenChange(false);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Could not save location'
				);
			}
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent
				showCloseButton
				className="flex max-h-[min(90vh,900px)] w-[min(100%-1.5rem,64rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
			>
				<DialogHeader className="shrink-0 border-b border-[#b8a99a]/30 px-5 py-4 pr-12">
					<DialogTitle className="font-heading text-xl text-[#333333]">
						{initial ? 'Edit map location' : 'Set map location'}
					</DialogTitle>
					<DialogDescription>
						Search with Google Places or enter the address and pin
						manually. Saved for blog post {postId}.
					</DialogDescription>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 lg:flex-row">
					<StepperNav
						steps={MAP_LOCATION_STEPS}
						currentStep={currentStep}
						onStepSelect={setCurrentStep}
					/>
					<div className="min-w-0 flex-1">
						{currentStep === STEP_FIND ? (
							<GoogleStep
								onPlaceSelected={applyPlaceAutofill}
								onSkip={() => setCurrentStep(STEP_LOCATION)}
							/>
						) : (
							<LocationStep
								address={address}
								sourceUrl={sourceUrl}
								lat={lat}
								lng={lng}
								latInput={latInput}
								lngInput={lngInput}
								onAddressChange={setAddress}
								onSourceUrlChange={setSourceUrl}
								onLatInputChange={handleLatInputChange}
								onLngInputChange={handleLngInputChange}
								onClearPin={clearPin}
								onPinChange={coords => setPin(coords.lat, coords.lng)}
							/>
						)}
						{error ? (
							<p
								className="mt-4 text-sm text-red-700"
								role="alert"
							>
								{error}
							</p>
						) : null}
					</div>
					{/* Balances the left stepper column so the form sits centered on large screens. */}
					<div
						className="hidden lg:block lg:w-56 lg:shrink-0"
						aria-hidden="true"
					/>
				</div>

				<DialogFooter className="mx-0 mb-0 shrink-0 p-5 sm:justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={pending}
					>
						Cancel
					</Button>
					<div className="flex flex-col-reverse gap-2 sm:flex-row">
						{currentStep === STEP_FIND ? (
							<Button
								type="button"
								onClick={() => setCurrentStep(STEP_LOCATION)}
							>
								Continue to location
							</Button>
						) : (
							<>
								<Button
									type="button"
									variant="outline"
									onClick={() => setCurrentStep(STEP_FIND)}
									disabled={pending}
								>
									Back to find place
								</Button>
								<Button
									type="button"
									onClick={handleSave}
									loading={pending}
									disabled={lat === null || lng === null}
								>
									Save location
								</Button>
							</>
						)}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
