'use client';

import { useState, useTransition } from 'react';
import StepperNav from '@/components/admin/listing-form/stepper-nav';
import {
	LISTING_FORM_STEPS,
	STEP_APIC,
	STEP_CATEGORY,
	STEP_CONTACT,
	STEP_GOOGLE,
	STEP_INSPECT,
	STEP_LOCATION,
	STEP_TAGS,
	STEP_TYPE_NAME
} from '@/components/admin/listing-form/constants';
import ApicDescriptionStep from '@/components/admin/listing-form/steps/apic-description-step';
import CategoryStep from '@/components/admin/listing-form/steps/category-step';
import ContactStep from '@/components/admin/listing-form/steps/contact-step';
import GoogleStep from '@/components/admin/listing-form/steps/google-step';
import InspectStep from '@/components/admin/listing-form/steps/inspect-step';
import LocationStep from '@/components/admin/listing-form/steps/location-step';
import TagsStep from '@/components/admin/listing-form/steps/tags-step';
import TypeNameStep from '@/components/admin/listing-form/steps/type-name-step';
import type { SelectedTagChip } from '@/components/admin/listing-tags-editor';
import RedirectSuccessDialog from '@/components/admin/redirect-success-dialog';
import { Button } from '@/components/ui/button';
import { BROWSE_SEARCH_HASH } from '@/lib/listings/browse-url';
import { createListing, updateListing } from '@/lib/listings/admin-actions';
import {
	contactsToFormRows,
	formRowsToContactsPayload,
	mergeContactsFromAutofill,
	type ContactFormRow
} from '@/lib/listings/contacts';
import {
	formStateToOpeningHours,
	openingHoursToFormState,
	type OpeningHoursFormState
} from '@/lib/listings/opening-hours';
import type {
	AdminListing,
	KnownTag,
	PlaceAutofill
} from '@/lib/listings/types';
import { isCategorySlug } from '@/lib/listings/types';
import { type CategorySlug, type Listing } from '@/lib/listings-search';

type ListingFormStepperProps = {
	mode: 'create' | 'edit';
	listing?: AdminListing;
	knownTags: KnownTag[];
};

export default function ListingFormStepper({
	mode,
	listing,
	knownTags
}: ListingFormStepperProps) {
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [successTitle, setSuccessTitle] = useState<string | null>(null);
	const [successHref, setSuccessHref] = useState<string | undefined>();
	const [successDescription, setSuccessDescription] = useState<
		string | undefined
	>();

	const [currentStep, setCurrentStep] = useState(
		mode === 'edit' ? STEP_TYPE_NAME : STEP_CATEGORY
	);

	const [name, setName] = useState(listing?.name ?? '');
	const [type, setType] = useState(listing?.type ?? '');
	const [address, setAddress] = useState(listing?.address ?? '');
	const [contacts, setContacts] = useState<ContactFormRow[]>(() =>
		contactsToFormRows(listing?.contacts ?? [])
	);
	const [notes, setNotes] = useState(listing?.notes ?? '');
	const [hours, setHours] = useState<OpeningHoursFormState>(() =>
		openingHoursToFormState(listing?.openingHours ?? null)
	);
	const [showHours, setShowHours] = useState(
		() => listing?.openingHours != null
	);
	const [category, setCategory] = useState(
		mode === 'edit' ? (listing?.category ?? '') : ''
	);
	const [sourceUrl, setSourceUrl] = useState(listing?.sourceUrl ?? '');
	const [selectedTags, setSelectedTags] = useState<SelectedTagChip[]>(() =>
		(listing?.tags ?? []).map(tagName => ({ name: tagName, isNew: false }))
	);
	const [pendingAliasMerges, setPendingAliasMerges] = useState<
		{ canonical: string; aliases: string[] }[]
	>([]);
	const [placesPrimaryType, setPlacesPrimaryType] = useState<string | null>(
		listing?.placesPrimaryType ?? null
	);
	const [placesTypes, setPlacesTypes] = useState<string[]>(
		listing?.placesTypes ?? []
	);
	const [lat, setLat] = useState<number | null>(listing?.lat ?? null);
	const [lng, setLng] = useState<number | null>(listing?.lng ?? null);
	const [latInput, setLatInput] = useState(
		listing?.lat != null ? String(listing.lat) : ''
	);
	const [lngInput, setLngInput] = useState(
		listing?.lng != null ? String(listing.lng) : ''
	);

	const lastStep = STEP_INSPECT;
	const isLastStep = currentStep === lastStep;

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

	/** Update pin from field text without rewriting inputs (avoids fighting mid-typing). */
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
		if (place.name) setName(place.name);
		if (place.type) setType(place.type);
		if (place.address) setAddress(place.address);
		if (place.contacts.length) {
			setContacts(prev => {
				const existing = formRowsToContactsPayload(prev);
				const merged = mergeContactsFromAutofill(existing, place.contacts);
				return contactsToFormRows(merged);
			});
		}
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
		setPlacesPrimaryType(place.placesPrimaryType);
		setPlacesTypes(place.placesTypes);
		setCurrentStep(STEP_TYPE_NAME);
		setMessage(
			place.lat !== null && place.lng !== null
				? 'Business applied — review the autofilled fields and confirm the map pin.'
				: 'Business applied — review fields and set a map pin if needed.'
		);
		setError(null);
	}

	function validateCurrentStep(): string | null {
		if (currentStep === STEP_CATEGORY) {
			if (!isCategorySlug(category)) return 'Choose a valid category.';
		}
		if (currentStep === STEP_TYPE_NAME) {
			if (!isCategorySlug(category)) return 'Choose a valid category.';
			if (!name.trim()) return 'Name is required.';
		}
		return null;
	}

	function goNext() {
		const validationError = validateCurrentStep();
		if (validationError) {
			setError(validationError);
			return;
		}
		setError(null);
		setMessage(null);
		if (isLastStep) {
			submit();
			return;
		}
		setCurrentStep(prev => Math.min(prev + 1, lastStep));
	}

	function goBack() {
		if (currentStep === 0) return;
		setError(null);
		setMessage(null);
		setCurrentStep(prev => Math.max(prev - 1, 0));
	}

	function buildFormData(): FormData {
		const formData = new FormData();
		formData.set('name', name);
		formData.set('category', category);
		formData.set('type', type);
		formData.set('address', address);
		formData.set('source_url', sourceUrl);
		formData.set('notes', notes);
		formData.set('latitude', lat === null ? '' : String(lat));
		formData.set('longitude', lng === null ? '' : String(lng));
		formData.set('tags', selectedTags.map(tag => tag.name).join(', '));
		formData.set('places_primary_type', placesPrimaryType ?? '');
		formData.set('places_types', JSON.stringify(placesTypes));
		formData.set('pending_alias_merges', JSON.stringify(pendingAliasMerges));
		const opening = showHours ? formStateToOpeningHours(hours) : null;
		formData.set('opening_hours', opening ? JSON.stringify(opening) : '');
		formData.set(
			'contacts_json',
			JSON.stringify(formRowsToContactsPayload(contacts))
		);
		return formData;
	}

	function submit() {
		if (!isCategorySlug(category)) {
			setError('Choose a valid category.');
			setCurrentStep(STEP_CATEGORY);
			return;
		}
		if (!name.trim()) {
			setError('Name is required.');
			setCurrentStep(STEP_TYPE_NAME);
			return;
		}

		const formData = buildFormData();
		const placeName = name.trim();
		const categorySlug = category;
		startTransition(async () => {
			setError(null);
			setMessage(null);
			if (mode === 'create') {
				const result = await createListing(formData);
				if (!result.ok) {
					setError(result.error);
					return;
				}
				setSuccessHref(
					`/${categorySlug}?place=${encodeURIComponent(placeName)}#${BROWSE_SEARCH_HASH}`
				);
				setSuccessDescription('Opening it on the map…');
				setSuccessTitle('Listing created');
				return;
			}

			if (!listing) return;
			const result = await updateListing(listing.id, formData);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setSuccessHref(undefined);
			setSuccessDescription(undefined);
			setSuccessTitle('Listing saved');
		});
	}

	const previewListing: Listing = {
		name: name.trim(),
		type: type.trim() || null,
		address: address.trim() || null,
		contacts: formRowsToContactsPayload(contacts),
		notes: notes.trim() || null,
		openingHours: showHours ? formStateToOpeningHours(hours) : null,
		category: isCategorySlug(category) ? category : 'food-dining',
		sourceUrl: sourceUrl.trim(),
		tags: selectedTags.map(tag => tag.name),
		lat,
		lng
	};

	const categoryForTags: CategorySlug = isCategorySlug(category)
		? category
		: 'food-dining';

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

			<div className="flex flex-col gap-8 lg:flex-row lg:items-start">
				<StepperNav
					steps={[...LISTING_FORM_STEPS]}
					currentStep={currentStep}
					onStepSelect={index => {
						setError(null);
						setMessage(null);
						setCurrentStep(index);
					}}
				/>

				<div className="min-w-0 flex-1 space-y-8 pb-24">
					{currentStep === STEP_CATEGORY ? (
						<CategoryStep
							category={category}
							onChange={setCategory}
						/>
					) : null}

					{currentStep === STEP_GOOGLE ? (
						<GoogleStep
							onPlaceSelected={applyPlaceAutofill}
							onSkip={() => {
								setCurrentStep(STEP_TYPE_NAME);
								setError(null);
								setMessage(
									'Skipped business lookup — enter listing details manually.'
								);
							}}
						/>
					) : null}

					{currentStep === STEP_TYPE_NAME ? (
						<TypeNameStep
							category={category}
							type={type}
							name={name}
							onCategoryChange={setCategory}
							onTypeChange={setType}
							onNameChange={setName}
						/>
					) : null}

					{currentStep === STEP_LOCATION ? (
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
					) : null}

					{currentStep === STEP_CONTACT ? (
						<ContactStep
							contacts={contacts}
							hours={hours}
							showHours={showHours}
							onContactsChange={setContacts}
							onHoursChange={setHours}
							onShowHoursChange={setShowHours}
						/>
					) : null}

					{currentStep === STEP_APIC ? (
						<ApicDescriptionStep
							notes={notes}
							onChange={setNotes}
						/>
					) : null}

					{currentStep === STEP_TAGS ? (
						<TagsStep
							knownTags={knownTags}
							selected={selectedTags}
							onChange={setSelectedTags}
							pendingAliasMerges={pendingAliasMerges}
							onPendingAliasMergesChange={setPendingAliasMerges}
							category={categoryForTags}
							name={name}
							type={type}
							address={address}
							notes={notes}
							placesPrimaryType={placesPrimaryType}
							placesTypes={placesTypes}
						/>
					) : null}

					{currentStep === STEP_INSPECT ? (
						<InspectStep preview={previewListing} />
					) : null}
				</div>
			</div>

			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#b8a99a]/30 bg-[#f7f2ec]/95 backdrop-blur-sm">
				<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3 px-4 py-4">
					<Button
						type="button"
						variant="outline"
						onClick={goBack}
						disabled={currentStep === 0 || pending}
					>
						Back
					</Button>
					<Button
						type="button"
						loading={pending}
						className={
							isLastStep && mode === 'create'
								? 'border-emerald-800 bg-emerald-700 text-white hover:border-emerald-900 hover:bg-emerald-800'
								: undefined
						}
						onClick={goNext}
					>
						{pending
							? isLastStep
								? mode === 'create'
									? 'Creating…'
									: 'Saving…'
								: 'Next'
							: isLastStep
								? mode === 'create'
									? 'Create listing'
									: 'Save changes'
								: 'Next'}
					</Button>
				</div>
			</div>

			<RedirectSuccessDialog
				open={successTitle !== null}
				title={successTitle ?? ''}
				href={successHref}
				description={successDescription}
			/>
		</div>
	);
}
