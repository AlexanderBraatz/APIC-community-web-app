'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AdminPinMap from '@/components/admin/pin-map';
import PlacesLookup, {
	type PlacesLookupStep
} from '@/components/admin/places-lookup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createListing, updateListing } from '@/lib/listings/admin-actions';
import {
	DAY_KEYS,
	DAY_LABELS,
	formStateToOpeningHours,
	openingHoursToFormState,
	type DayFormState,
	type DayKey,
	type OpeningHoursFormState
} from '@/lib/listings/opening-hours';
import type { AdminListing, PlaceAutofill } from '@/lib/listings/types';
import { CATEGORY_SLUGS } from '@/lib/listings-search';

const CATEGORY_LABELS: Record<(typeof CATEGORY_SLUGS)[number], string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

type ListingFormProps = {
	mode: 'create' | 'edit';
	listing?: AdminListing;
	knownTags: string[];
};

type FormPhase = 'lookup' | 'details';

function updateDay(
	state: OpeningHoursFormState,
	day: DayKey,
	patch: Partial<DayFormState>
): OpeningHoursFormState {
	return {
		...state,
		days: {
			...state.days,
			[day]: { ...state.days[day], ...patch }
		}
	};
}

export default function ListingForm({
	mode,
	listing,
	knownTags
}: ListingFormProps) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const [phase, setPhase] = useState<FormPhase>(
		mode === 'edit' ? 'details' : 'lookup'
	);
	const [lookupStep, setLookupStep] = useState<PlacesLookupStep>('business');

	const [name, setName] = useState(listing?.name ?? '');
	const [type, setType] = useState(listing?.type ?? '');
	const [address, setAddress] = useState(listing?.address ?? '');
	const [phone, setPhone] = useState(listing?.phone ?? '');
	const [email, setEmail] = useState(listing?.email ?? '');
	const [website, setWebsite] = useState(listing?.website ?? '');
	const [notes, setNotes] = useState(listing?.notes ?? '');
	const [hours, setHours] = useState<OpeningHoursFormState>(() =>
		openingHoursToFormState(listing?.openingHours ?? null)
	);
	const [showHours, setShowHours] = useState(
		() => listing?.openingHours != null
	);
	const [category, setCategory] = useState(listing?.category ?? 'food-dining');
	const [sourceUrl, setSourceUrl] = useState(listing?.sourceUrl ?? '');
	const [tagsText, setTagsText] = useState((listing?.tags ?? []).join(', '));
	const [lat, setLat] = useState<number | null>(listing?.lat ?? null);
	const [lng, setLng] = useState<number | null>(listing?.lng ?? null);
	const [latInput, setLatInput] = useState(
		listing?.lat != null ? String(listing.lat) : ''
	);
	const [lngInput, setLngInput] = useState(
		listing?.lng != null ? String(listing.lng) : ''
	);

	const pinLocked = lat !== null && lng !== null;

	const tagSuggestions = useMemo(() => {
		const active = new Set(
			tagsText
				.split(',')
				.map(t => t.trim().toLowerCase())
				.filter(Boolean)
		);
		return knownTags.filter(tag => !active.has(tag.toLowerCase())).slice(0, 24);
	}, [knownTags, tagsText]);

	function addTag(tag: string) {
		const current = tagsText
			.split(',')
			.map(t => t.trim())
			.filter(Boolean);
		if (current.some(t => t.toLowerCase() === tag.toLowerCase())) return;
		setTagsText([...current, tag].join(', '));
	}

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

	function showLocationPin() {
		setError(null);
		setMessage(null);
		const parsedLat = Number(latInput.trim());
		const parsedLng = Number(lngInput.trim());
		if (
			!latInput.trim() ||
			!lngInput.trim() ||
			!Number.isFinite(parsedLat) ||
			!Number.isFinite(parsedLng)
		) {
			setError('Enter valid latitude and longitude numbers.');
			return;
		}
		if (parsedLat < -90 || parsedLat > 90) {
			setError('Latitude must be between -90 and 90.');
			return;
		}
		if (parsedLng < -180 || parsedLng > 180) {
			setError('Longitude must be between -180 and 180.');
			return;
		}
		setPin(parsedLat, parsedLng);
		setMessage('Location pin shown on the map — confirm, then save.');
	}

	function applyPlaceAutofill(place: PlaceAutofill) {
		if (place.name) setName(place.name);
		if (place.address) setAddress(place.address);
		if (place.phone) setPhone(place.phone);
		if (place.website) setWebsite(place.website);
		if (place.sourceUrl) {
			setSourceUrl(prev => (prev.trim() ? prev : place.sourceUrl!));
		}
		if (place.openingHours) {
			setHours(openingHoursToFormState(place.openingHours));
			setShowHours(true);
		}
		if (place.lat !== null && place.lng !== null) {
			setPin(place.lat, place.lng);
		}
		setPhase('details');
		setMessage(
			place.lat !== null && place.lng !== null
				? 'Place applied — review the autofilled fields and confirm the map pin.'
				: 'Place applied — review fields and set a map pin if needed.'
		);
		setError(null);
	}

	function startPlacesLookup() {
		setLookupStep('business');
		setPhase('lookup');
		setError(null);
		setMessage(null);
	}

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		formData.set('latitude', lat === null ? '' : String(lat));
		formData.set('longitude', lng === null ? '' : String(lng));
		formData.set('tags', tagsText);
		const opening = formStateToOpeningHours(hours);
		formData.set('opening_hours', opening ? JSON.stringify(opening) : '');

		startTransition(async () => {
			setError(null);
			setMessage(null);
			if (mode === 'create') {
				const result = await createListing(formData);
				if (!result.ok) {
					setError(result.error);
					return;
				}
				router.push(
					`/members/admin/listings/${result.id}?message=${encodeURIComponent(
						'Listing created.'
					)}`
				);
				router.refresh();
				return;
			}

			if (!listing) return;
			const result = await updateListing(listing.id, formData);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setMessage('Listing saved.');
			router.refresh();
		});
	}

	if (phase === 'lookup') {
		return (
			<div className="space-y-6">
				{error ? (
					<p
						className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
						role="alert"
					>
						{error}
					</p>
				) : null}
				{message ? (
					<p
						className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
						role="status"
					>
						{message}
					</p>
				) : null}
				<PlacesLookup
					step={lookupStep}
					onStepChange={setLookupStep}
					onPlaceSelected={applyPlaceAutofill}
					onSkipToDetails={() => {
						setPhase('details');
						setMessage(
							'Enter listing details manually and set a location on the map.'
						);
					}}
					showCancel={mode === 'edit'}
					onCancel={() => {
						setPhase('details');
						setError(null);
						setMessage(null);
					}}
				/>
				<div className="flex flex-wrap gap-3">
					<Button
						type="button"
						variant="outline"
						className="rounded-[2px]"
						onClick={() => router.push('/members/admin/listings')}
					>
						Back to list
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form
			onSubmit={onSubmit}
			className="space-y-8"
		>
			{error ? (
				<p
					className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}
			{message ? (
				<p
					className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{message}
				</p>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-xs text-[#888]">
					Review and edit fields below. Use Places lookup to refill from Google.
				</p>
				<Button
					type="button"
					variant="outline"
					className="rounded-[2px]"
					onClick={startPlacesLookup}
				>
					Look up with Google Places
				</Button>
			</div>

			<section className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="name">Name</Label>
					<Input
						id="name"
						name="name"
						value={name}
						onChange={e => setName(e.target.value)}
						required
						maxLength={300}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="category">Category</Label>
					<select
						id="category"
						name="category"
						value={category}
						onChange={e =>
							setCategory(e.target.value as (typeof CATEGORY_SLUGS)[number])
						}
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
						required
					>
						{CATEGORY_SLUGS.map(slug => (
							<option
								key={slug}
								value={slug}
							>
								{CATEGORY_LABELS[slug]}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="type">Type</Label>
					<Input
						id="type"
						name="type"
						value={type}
						onChange={e => setType(e.target.value)}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="address">Address</Label>
					<Input
						id="address"
						name="address"
						value={address}
						onChange={e => setAddress(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="phone">Phone</Label>
					<Input
						id="phone"
						name="phone"
						value={phone}
						onChange={e => setPhone(e.target.value)}
						placeholder="+39 …"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="website">Website</Label>
					<Input
						id="website"
						name="website"
						value={website}
						onChange={e => setWebsite(e.target.value)}
						placeholder="https://"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="source_url">Google Maps Link</Label>
					<Input
						id="source_url"
						name="source_url"
						type="url"
						value={sourceUrl}
						onChange={e => setSourceUrl(e.target.value)}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="notes">Notes</Label>
					<Textarea
						id="notes"
						name="notes"
						value={notes}
						onChange={e => setNotes(e.target.value)}
						rows={4}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="tags">Tags (comma-separated)</Label>
					<Input
						id="tags"
						name="tags"
						value={tagsText}
						onChange={e => setTagsText(e.target.value)}
						placeholder="Restaurant, Montaione, wine"
					/>
					{tagSuggestions.length > 0 ? (
						<div className="flex flex-wrap gap-2 pt-1">
							{tagSuggestions.map(tag => (
								<button
									key={tag}
									type="button"
									onClick={() => addTag(tag)}
									className="border border-[#b8a99a] px-2 py-1 text-xs text-[#444] hover:bg-[#f7f2ec]"
								>
									+ {tag}
								</button>
							))}
						</div>
					) : null}
				</div>
			</section>

			<section className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-medium text-[#444]">Opening hours</h3>
						{showHours ? (
							<p className="text-xs text-[#888]">
								Leave a day blank if unknown. Check Closed, or enter one or two
								open/close periods (24-hour, e.g. 09:00).
							</p>
						) : (
							<p className="text-xs text-[#888]">
								Optional — expand to edit, or leave blank until autofilled from
								Places.
							</p>
						)}
					</div>
					<Button
						type="button"
						variant="outline"
						className="rounded-[2px]"
						onClick={() => setShowHours(prev => !prev)}
						aria-expanded={showHours}
					>
						{showHours ? 'Hide opening hours' : 'Add opening hours'}
					</Button>
				</div>
				{showHours ? (
					<>
						<div className="space-y-2">
							{DAY_KEYS.map(day => {
								const row = hours.days[day];
								return (
									<div
										key={day}
										className="grid grid-cols-[3rem_auto_1fr] items-center gap-2 sm:grid-cols-[3.5rem_auto_repeat(4,minmax(0,5.5rem))]"
									>
										<span className="text-sm font-medium text-[#444]">
											{DAY_LABELS[day]}
										</span>
										<label className="flex items-center gap-1.5 text-xs text-[#666]">
											<input
												type="checkbox"
												checked={row.closed}
												onChange={e =>
													setHours(prev =>
														updateDay(prev, day, { closed: e.target.checked })
													)
												}
											/>
											Closed
										</label>
										{row.closed ? (
											<span className="col-span-1 text-xs text-[#999] sm:col-span-4">
												Closed all day
											</span>
										) : (
											<>
												<Input
													aria-label={`${DAY_LABELS[day]} open`}
													placeholder="Open"
													value={row.open1}
													onChange={e =>
														setHours(prev =>
															updateDay(prev, day, { open1: e.target.value })
														)
													}
													className="h-8"
												/>
												<Input
													aria-label={`${DAY_LABELS[day]} close`}
													placeholder="Close"
													value={row.close1}
													onChange={e =>
														setHours(prev =>
															updateDay(prev, day, { close1: e.target.value })
														)
													}
													className="h-8"
												/>
												<Input
													aria-label={`${DAY_LABELS[day]} open 2`}
													placeholder="Open 2"
													value={row.open2}
													onChange={e =>
														setHours(prev =>
															updateDay(prev, day, { open2: e.target.value })
														)
													}
													className="h-8"
												/>
												<Input
													aria-label={`${DAY_LABELS[day]} close 2`}
													placeholder="Close 2"
													value={row.close2}
													onChange={e =>
														setHours(prev =>
															updateDay(prev, day, { close2: e.target.value })
														)
													}
													className="h-8"
												/>
											</>
										)}
									</div>
								);
							})}
						</div>
						<div className="space-y-2">
							<Label htmlFor="hours_note">Hours note (optional)</Label>
							<Input
								id="hours_note"
								value={hours.note}
								onChange={e =>
									setHours(prev => ({ ...prev, note: e.target.value }))
								}
								placeholder="By appointment only"
							/>
						</div>
					</>
				) : null}
			</section>

			<section className="space-y-3">
				<div>
					<h3 className="text-sm font-medium text-[#444]">Map pin</h3>
					<p className="text-xs text-[#888]">
						{pinLocked
							? 'Pin set — clear to edit coordinates or place a new pin.'
							: 'Enter latitude and longitude, click Show location pin, or click the map.'}
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="latitude_input">Latitude</Label>
						<Input
							id="latitude_input"
							value={latInput}
							onChange={e => setLatInput(e.target.value)}
							placeholder="43.54844"
							inputMode="decimal"
							disabled={pinLocked}
							readOnly={pinLocked}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="longitude_input">Longitude</Label>
						<Input
							id="longitude_input"
							value={lngInput}
							onChange={e => setLngInput(e.target.value)}
							placeholder="10.85667"
							inputMode="decimal"
							disabled={pinLocked}
							readOnly={pinLocked}
						/>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					{pinLocked ? (
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={clearPin}
						>
							Clear pin location
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={showLocationPin}
							disabled={!latInput.trim() || !lngInput.trim()}
						>
							Show location pin
						</Button>
					)}
				</div>
				<input
					type="hidden"
					name="latitude"
					value={lat ?? ''}
				/>
				<input
					type="hidden"
					name="longitude"
					value={lng ?? ''}
				/>
				<AdminPinMap
					lat={lat}
					lng={lng}
					onChange={coords => {
						setPin(coords.lat, coords.lng);
					}}
				/>
			</section>

			<div className="flex flex-wrap gap-3">
				<Button
					type="submit"
					disabled={pending}
					className="rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22]"
				>
					{pending
						? 'Saving…'
						: mode === 'create'
						? 'Create listing'
						: 'Save changes'}
				</Button>
				<Button
					type="button"
					variant="outline"
					className="rounded-[2px]"
					onClick={() => router.push('/members/admin/listings')}
				>
					Back to list
				</Button>
			</div>
		</form>
	);
}
