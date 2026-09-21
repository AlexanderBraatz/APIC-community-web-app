import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/utils';
import type { AdminListing } from '@/lib/listings/types';

type MissingGeocodeAlertProps = {
	listings: AdminListing[];
	action: () => Promise<void>;
};

export default function MissingGeocodeAlert({
	listings,
	action
}: MissingGeocodeAlertProps) {
	if (listings.length === 0) return null;

	return (
		<section
			className="space-y-4 border border-amber-200 bg-amber-50 px-4 py-4"
			role="alert"
		>
			<div>
				<h3 className="text-sm font-medium text-amber-950">
					Listings missing a map location
				</h3>
				<p className="mt-1 text-sm text-amber-900">
					Please add a location to these listings so members can find them on
					the map.
				</p>
			</div>

			<ul className="divide-y divide-amber-200/80 border-t border-amber-200/80">
				{listings.map(listing => (
					<li
						key={listing.id}
						className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="min-w-0 text-sm">
							<p className="font-medium text-amber-950">{listing.name}</p>
							{listing.address ? (
								<p className="truncate text-amber-900/80">{listing.address}</p>
							) : (
								<p className="text-amber-900/80">No address set</p>
							)}
						</div>
						<Link
							href={`/members/admin/listings/${listing.id}`}
							className={cn(
								buttonVariants({ variant: 'secondary', size: 'sm' }),
								'shrink-0 gap-1.5'
							)}
						>
							<Pencil className="size-3.5" aria-hidden />
							Edit
						</Link>
					</li>
				))}
			</ul>

			<form action={action}>
				<SubmitButton variant="outline" className="w-full sm:w-auto">
					Geocode missing ({listings.length})
				</SubmitButton>
			</form>
		</section>
	);
}
