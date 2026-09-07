import { notFound } from 'next/navigation';
import DeleteListingButton from '@/components/admin/delete-listing-button';
import ListingForm from '@/components/admin/listing-form';
import {
	getAdminListing,
	listKnownTags
} from '@/lib/listings/admin-actions';

export default async function EditListingPage({
	params,
	searchParams
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ message?: string }>;
}) {
	const { id } = await params;
	const query = await searchParams;
	const [listing, knownTags] = await Promise.all([
		getAdminListing(id),
		listKnownTags()
	]);

	if (!listing) notFound();

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-xl font-medium text-[#444]">Edit listing</h2>
					<p className="mt-1 text-sm text-[#666]">{listing.name}</p>
				</div>
				<DeleteListingButton id={listing.id} name={listing.name} />
			</div>

			{query.message ? (
				<p
					className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{query.message}
				</p>
			) : null}

			<ListingForm mode="edit" listing={listing} knownTags={knownTags} />
		</div>
	);
}
