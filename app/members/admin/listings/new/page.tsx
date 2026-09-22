import ListingFormStepper from '@/components/admin/listing-form-stepper';
import { listKnownTags } from '@/lib/listings/admin-actions';

export default async function NewListingPage() {
	const knownTags = await listKnownTags();

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-medium text-[#444]">New recommendation</h2>
			</div>
			<ListingFormStepper mode="create" knownTags={knownTags} />
		</div>
	);
}
