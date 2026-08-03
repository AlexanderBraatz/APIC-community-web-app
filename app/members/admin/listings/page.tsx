import Link from 'next/link';
import { redirect } from 'next/navigation';
import DeleteListingButton from '@/components/admin/delete-listing-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	geocodeMissingListings,
	listAdminListings
} from '@/lib/listings/admin-actions';
import { CATEGORY_SLUGS } from '@/lib/listings-search';

const CATEGORY_LABELS: Record<string, string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

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
		category?: string;
		q?: string;
	}>;
}) {
	const params = await searchParams;
	const listings = await listAdminListings({
		category: params.category,
		q: params.q
	});
	const missingCoords = listings.filter(row => row.lat === null || row.lng === null)
		.length;

	return (
		<div className="space-y-8">
			<section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="text-xl font-medium text-[#444]">Listings</h2>
					<p className="mt-1 text-sm text-[#666]">
						Create and edit places. Most seeded rows still need coordinates —
						geocode individually or run the batch helper (exact single-result
						addresses only).
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<form action={geocodeMissingAction}>
						<Button
							type="submit"
							variant="outline"
							className="rounded-[2px]"
							disabled={missingCoords === 0}
						>
							Geocode missing ({missingCoords})
						</Button>
					</form>
					<Link
						href="/members/admin/listings/new"
						className="inline-flex h-8 items-center rounded-[2px] border border-[#634627] bg-[#805b32] px-3 text-sm font-medium text-white hover:bg-[#1f2d22]"
					>
						New listing
					</Link>
				</div>
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

			<form className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<div className="w-full space-y-2 sm:max-w-xs">
					<Label htmlFor="q">Search</Label>
					<Input
						id="q"
						name="q"
						defaultValue={params.q ?? ''}
						placeholder="Name, address, tag"
					/>
				</div>
				<div className="w-full space-y-2 sm:max-w-xs">
					<Label htmlFor="category">Category</Label>
					<select
						id="category"
						name="category"
						defaultValue={params.category ?? ''}
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						<option value="">All</option>
						{CATEGORY_SLUGS.map(slug => (
							<option key={slug} value={slug}>
								{CATEGORY_LABELS[slug]}
							</option>
						))}
					</select>
				</div>
				<Button type="submit" variant="outline" className="rounded-[2px]">
					Filter
				</Button>
			</form>

			{listings.length === 0 ? (
				<p className="text-sm text-[#888]">No listings match.</p>
			) : (
				<ul className="divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
					{listings.map(listing => (
						<li
							key={listing.id}
							className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0 text-sm">
								<p className="font-medium text-[#444]">{listing.name}</p>
								<p className="text-[#888]">
									{CATEGORY_LABELS[listing.category] ?? listing.category}
									{listing.type ? ` · ${listing.type}` : ''}
									{listing.lat === null
										? ' · no pin'
										: ` · ${listing.lat.toFixed(4)}, ${listing.lng?.toFixed(4)}`}
								</p>
								{listing.address ? (
									<p className="truncate text-[#888]">{listing.address}</p>
								) : null}
							</div>
							<div className="flex flex-wrap gap-2">
								<Link
									href={`/members/admin/listings/${listing.id}`}
									className="inline-flex h-8 items-center rounded-[2px] border border-[#634627] px-3 text-sm text-[#805b32] hover:bg-[#f7f2ec]"
								>
									Edit
								</Link>
								<DeleteListingButton id={listing.id} name={listing.name} />
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
