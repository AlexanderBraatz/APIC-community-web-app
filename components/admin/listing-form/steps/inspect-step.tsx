'use client';

import ListingResultCard from '@/components/ui/listing-result-card';
import LocationsMap from '@/components/ui/locations-map';
import type { Listing } from '@/lib/listings-search';

type InspectStepProps = {
	preview: Listing;
};

export default function InspectStep({ preview }: InspectStepProps) {
	const hasPin =
		typeof preview.lat === 'number' &&
		Number.isFinite(preview.lat) &&
		typeof preview.lng === 'number' &&
		Number.isFinite(preview.lng);

	const tags = preview.tags ?? [];

	return (
		<section className="space-y-4">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Inspect & accept</h3>
				<p className="mt-1 text-xs text-[#888]">
					Preview how members will see this recommendation, then create or save.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
				<div className="order-2 rounded-[2px] border border-[#b8a99a]/40 bg-[#f7f2ec]/40 px-4 py-6 lg:order-1">
					{preview.name.trim() ? (
						<ListingResultCard listing={preview} />
					) : (
						<p className="text-sm text-[#888]">
							Add a name on Type & Name to preview the card.
						</p>
					)}
				</div>
				<div className="order-1 self-start lg:order-2">
					{hasPin ? (
						<LocationsMap
							locations={[preview]}
							selectedName={preview.name || null}
							highlightedName={null}
							onSelect={() => {}}
							onClearSelect={() => {}}
						/>
					) : (
						<div className="flex aspect-[2/1] w-full items-center justify-center border border-[#b8a99a]/40 bg-[#e8e4dc] px-4 text-center text-sm text-[#666]">
							No map pin set — go back to Location to place one.
						</div>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<h4 className="text-sm font-medium text-[#444]">
					Keywords used to search for this business
				</h4>
				{tags.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{tags.map(tag => (
							<span
								key={tag}
								className="border border-[#b8a99a]/50 bg-[#f7f2ec] px-2 py-1 text-xs text-[#444]"
							>
								{tag}
							</span>
						))}
					</div>
				) : (
					<p className="text-xs text-[#999]">No keywords selected yet.</p>
				)}
			</div>
		</section>
	);
}
