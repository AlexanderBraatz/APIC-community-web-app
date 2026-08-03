import ListingForm from '@/components/admin/listing-form';
import { listAllTagNames } from '@/lib/listings/admin-actions';

export default async function NewListingPage() {
	const knownTags = await listAllTagNames();

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-medium text-[#444]">New listing</h2>
				<p className="mt-1 text-sm text-[#666]">
					Add a place, attach tags, and confirm a map pin before members see it
					on the category map.
				</p>
			</div>
			<ListingForm mode="create" knownTags={knownTags} />
		</div>
	);
}
