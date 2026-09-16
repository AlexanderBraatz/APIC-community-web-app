import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminListingsList from '@/components/admin/admin-listings-list';
import MissingGeocodeAlert from '@/components/admin/missing-geocode-alert';
import {
	geocodeMissingListings,
	listAdminListings
} from '@/lib/listings/admin-actions';

async function geocodeMissingAction() {
	'use server';
	const result = await geocodeMissingListings();
	if (!result.ok) {
		redirect(
			`/members/admin/listings?error=${encodeURIComponent(result.error)}`
		);
	}
	redirect(
		`/members/admin/listings?message=${encodeURIComponent(
			`Geocoded ${result.updated} · skipped ${result.skipped} · failed ${result.failed}`
		)}`
	);
}

export default async function AdminListingsPage({
	searchParams
}: {
	searchParams: Promise<{
		error?: string;
		message?: string;
	}>;
}) {
	const params = await searchParams;
	const listings = await listAdminListings();
	const missingCoords = listings.filter(
		row => row.lat === null || row.lng === null
	);

	return (
		<div className="space-y-8">
			<section>
				<h2 className="text-xl font-medium text-[#444]">Listings</h2>
				<p className="mt-1 text-sm text-[#666]">
					Listings are the places, services, and local recommendations members
					browse on the community site — restaurants, shops, wellness, and more
					around Castelfalfi and Tuscany.
				</p>
			</section>

			{params.error ? (
				<p
					className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}
			{params.message ? (
				<p
					className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{params.message}
				</p>
			) : null}

			<MissingGeocodeAlert
				listings={missingCoords}
				action={geocodeMissingAction}
			/>

			<div className="space-y-2">
				<h3 className="text-sm font-medium text-[#444]">Add new Listing</h3>
				<Link
					href="/members/admin/listings/new"
					className="inline-flex h-8 items-center rounded-[2px] border border-[#634627] bg-[#805b32] px-3 text-sm font-medium text-white hover:bg-[#1f2d22]"
				>
					New listing
				</Link>
			</div>

			<AdminListingsList listings={listings} />
		</div>
	);
}
