'use client';

import PlacesLookup from '@/components/admin/places-lookup';
import type { PlaceAutofill } from '@/lib/listings/types';

type GoogleStepProps = {
	onPlaceSelected: (place: PlaceAutofill) => void;
	onSkip: () => void;
};

export default function GoogleStep({
	onPlaceSelected,
	onSkip
}: GoogleStepProps) {
	return (
		<section className="space-y-4">
			<p className="text-xs text-[#888]">
				Search for the business to autofill name, address, map pin, and
				contacts.
			</p>
			<PlacesLookup
				onPlaceSelected={onPlaceSelected}
				onSkipToDetails={onSkip}
			/>
		</section>
	);
}
