'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import DeleteListingButton from '@/components/admin/delete-listing-button';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { AdminListing } from '@/lib/listings/types';

const CATEGORY_LABELS: Record<string, string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

function matchesQuery(listing: AdminListing, q: string) {
	return (
		listing.name.toLowerCase().includes(q) ||
		listing.address?.toLowerCase().includes(q) ||
		listing.contacts.some(c => c.value.toLowerCase().includes(q)) ||
		listing.tags.some(tag => tag.toLowerCase().includes(q)) ||
		(listing.type?.toLowerCase().includes(q) ?? false) ||
		(CATEGORY_LABELS[listing.category] ?? listing.category)
			.toLowerCase()
			.includes(q)
	);
}

export default function AdminListingsList({
	listings
}: {
	listings: AdminListing[];
}) {
	const [query, setQuery] = useState('');
	const deferredQuery = useDeferredValue(query);
	const q = deferredQuery.trim().toLowerCase();
	const filtered = q
		? listings.filter(listing => matchesQuery(listing, q))
		: listings;

	return (
		<div className="space-y-4">
			<div className="w-full space-y-2 sm:max-w-xs">
				<Label htmlFor="q">Search existing Recommendations</Label>
				<Input
					id="q"
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder="Name, address, keyword"
					autoComplete="off"
				/>
			</div>

			{filtered.length === 0 ? (
				<p className="text-sm text-[#888]">No recommendations match.</p>
			) : (
				<ul className="divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
					{filtered.map(listing => (
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
									className={cn(
										buttonVariants({ variant: 'secondary', size: 'sm' }),
										'gap-1.5'
									)}
								>
									<Pencil className="size-3.5" aria-hidden />
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
