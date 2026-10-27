'use client';

import type { ReactNode } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import LocationsMap from '@/components/ui/locations-map';
import type { BlogMapLocation } from '@/lib/blog/map-location-actions';
import type { Listing } from '@/lib/listings-search';
import { cn } from '@/lib/utils';

function googleMapsHref(location: BlogMapLocation): string {
	if (location.sourceUrl?.trim()) return location.sourceUrl.trim();
	return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}

function legendText(location: BlogMapLocation): string {
	const address = location.address?.trim();
	if (address) return address;
	return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

function toMapListing(location: BlogMapLocation): Listing {
	return {
		name: location.address?.trim() || 'Location',
		type: null,
		address: location.address,
		contacts: [],
		notes: null,
		openingHours: null,
		category: 'blog',
		sourceUrl: location.sourceUrl ?? '',
		tags: [],
		lat: location.lat,
		lng: location.lng
	};
}

/**
 * Presentational map chrome shared by the public BlogMap and admin preview.
 */
export default function BlogMapDisplay({
	location,
	footerExtra
}: {
	location: BlogMapLocation;
	footerExtra?: ReactNode;
}) {
	return (
		<div className="overflow-hidden rounded-3xl border border-[#968778]">
			<LocationsMap
				locations={[toMapListing(location)]}
				showTooltipsByDefault
				className="aspect-[1.618/1] rounded-none border-0 lg:aspect-[1.618/1] lg:h-auto"
			/>
			<footer className="flex flex-col gap-3 border-t border-[#968778] bg-[#fffdfa] px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
				<p className="font-sans text-sm leading-relaxed text-[#555555]">
					{legendText(location)}
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<a
						href={googleMapsHref(location)}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(
							buttonVariants({ variant: 'default', size: 'sm' }),
							'gap-2'
						)}
					>
						<MapIcon
							className="size-4 shrink-0"
							aria-hidden="true"
						/>
						Open in Google Maps
					</a>
					{footerExtra}
				</div>
			</footer>
		</div>
	);
}
