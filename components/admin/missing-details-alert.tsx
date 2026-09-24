import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { isCategorySlug, type AdminListing } from '@/lib/listings/types';

type MissingDetailsAlertProps = {
	listings: AdminListing[];
};

function missingFields(listing: AdminListing): string[] {
	const fields: string[] = [];
	if (!listing.name.trim()) fields.push('name');
	if (!listing.notes?.trim()) fields.push('description');
	if (!isCategorySlug(listing.category)) fields.push('category');
	return fields;
}

export function listingMissingDetails(listing: AdminListing): boolean {
	return missingFields(listing).length > 0;
}

export default function MissingDetailsAlert({
	listings
}: MissingDetailsAlertProps) {
	if (listings.length === 0) return null;

	return (
		<section
			className="space-y-4 border border-amber-200 bg-amber-50 px-4 py-4"
			role="alert"
		>
			<div>
				<h3 className="text-sm font-medium text-amber-950">
					Recommendations missing details
				</h3>
				<p className="mt-1 text-sm text-amber-900">
					Please fill in any missing name, category, or APIC description so
					these recommendations are ready for members.
				</p>
			</div>

			<ul className="divide-y divide-amber-200/80 border-t border-amber-200/80">
				{listings.map(listing => {
					const missing = missingFields(listing);
					return (
						<li
							key={listing.id}
							className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0 text-sm">
								<p className="font-medium text-amber-950">
									{listing.name.trim() || 'Untitled recommendation'}
								</p>
								<p className="text-amber-900/80">
									Missing: {missing.join(', ')}
								</p>
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
					);
				})}
			</ul>
		</section>
	);
}
