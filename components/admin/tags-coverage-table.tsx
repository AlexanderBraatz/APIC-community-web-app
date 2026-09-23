'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
	HeartPulse,
	ShoppingBag,
	UtensilsCrossed,
	Wrench,
	X,
	type LucideIcon
} from 'lucide-react';
import { CATEGORY_LABELS } from '@/components/admin/listing-form/constants';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import type { CategorySlug } from '@/lib/listings-search';
import type { AdminListing } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<CategorySlug, LucideIcon> = {
	'food-dining': UtensilsCrossed,
	'services-maintenance': Wrench,
	'health-wellness': HeartPulse,
	'shop-market': ShoppingBag
};

const ACTIVE_CHIP_CLASS =
	'font-sans inline-flex items-center gap-1.5 bg-[#805b32] px-2.5 py-1 text-xs text-white transition-colors hover:bg-[#6a4b29]';
const INACTIVE_CHIP_CLASS =
	'font-sans inline-flex items-center border border-[#b8a99a] px-2.5 py-1 text-xs text-[#333333] transition-colors hover:border-[#7A5A32] hover:bg-[#f7f3ec]';

function sortRows(
	listings: AdminListing[],
	activeTag: string | null
): AdminListing[] {
	return [...listings].sort((a, b) => {
		if (activeTag) {
			const needle = activeTag.toLowerCase();
			const aMatch = a.tags.some(t => t.toLowerCase() === needle) ? 0 : 1;
			const bMatch = b.tags.some(t => t.toLowerCase() === needle) ? 0 : 1;
			if (aMatch !== bMatch) return aMatch - bMatch;
		}
		if (a.tags.length !== b.tags.length) {
			return a.tags.length - b.tags.length;
		}
		return a.name.localeCompare(b.name);
	});
}

function sortedTags(tags: string[]): string[] {
	return [...tags].sort((a, b) => a.localeCompare(b));
}

function CategoryIcon({ category }: { category: CategorySlug }) {
	const Icon = CATEGORY_ICONS[category];
	const label = CATEGORY_LABELS[category];
	return (
		<span
			className="inline-flex text-[#555]"
			title={label}
			aria-label={label}
		>
			<Icon className="size-4" aria-hidden="true" />
		</span>
	);
}

export default function TagsCoverageTable({
	listings
}: {
	listings: AdminListing[];
}) {
	const [activeTag, setActiveTag] = useState<string | null>(null);

	const rows = useMemo(
		() => sortRows(listings, activeTag),
		[listings, activeTag]
	);

	function selectTag(tag: string) {
		setActiveTag(tag);
	}

	function clearFilter() {
		setActiveTag(null);
	}

	return (
		<div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 space-y-3 px-4">
			{activeTag ? (
				<div>
					<p className="font-heading mb-2 text-xs tracking-wide text-[#333333] uppercase">
						Filtering by keywords:
					</p>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={clearFilter}
							className={ACTIVE_CHIP_CLASS}
							aria-label={`Remove keyword ${activeTag}`}
						>
							{activeTag}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					</div>
				</div>
			) : null}

			<div className="w-full overflow-hidden rounded-md border border-[#ddd] bg-white">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Type</TableHead>
							<TableHead className="w-12">Category</TableHead>
							<TableHead>Keywords</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-8 text-center text-[#888]"
								>
									No recommendations yet.
								</TableCell>
							</TableRow>
						) : (
							rows.map(listing => (
								<TableRow key={listing.id}>
									<TableCell className="w-[16%] min-w-[10rem] font-medium whitespace-normal text-[#333]">
										<Link
											href={`/members/admin/listings/${listing.id}`}
											className="hover:underline"
										>
											{listing.name}
										</Link>
									</TableCell>
									<TableCell className="w-[12%] text-[#666]">
										{listing.type?.trim() || '—'}
									</TableCell>
									<TableCell className="w-12">
										<CategoryIcon category={listing.category} />
									</TableCell>
									<TableCell className="whitespace-normal">
										{listing.tags.length === 0 ? (
											<span className="font-sans text-xs text-[#999]">
												No keywords
											</span>
										) : (
											<div className="flex flex-wrap gap-1.5">
												{sortedTags(listing.tags).map(tag => {
													const isActive =
														activeTag !== null &&
														tag.toLowerCase() ===
															activeTag.toLowerCase();
													return (
														<button
															key={tag}
															type="button"
															onClick={() => selectTag(tag)}
															className={cn(
																isActive
																	? ACTIVE_CHIP_CLASS
																	: INACTIVE_CHIP_CLASS
															)}
															aria-pressed={isActive}
															aria-label={`Filter by keyword ${tag}`}
														>
															{tag}
														</button>
													);
												})}
											</div>
										)}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
