'use client';

import ListingTagsEditor, {
	type SelectedTagChip
} from '@/components/admin/listing-tags-editor';
import type { CategorySlug } from '@/lib/listings-search';
import type { KnownTag } from '@/lib/listings/types';

type TagsStepProps = {
	knownTags: KnownTag[];
	selected: SelectedTagChip[];
	onChange: (tags: SelectedTagChip[]) => void;
	pendingAliasMerges: { canonical: string; aliases: string[] }[];
	onPendingAliasMergesChange: (
		merges: { canonical: string; aliases: string[] }[]
	) => void;
	category: CategorySlug;
	name: string;
	type: string;
	address: string;
	notes: string;
	placesPrimaryType: string | null;
	placesTypes: string[];
};

export default function TagsStep(props: TagsStepProps) {
	return (
		<section className="space-y-4">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Tags</h3>
				<p className="mt-1 text-xs text-[#888]">
					When this step opens empty, AI suggests existing tags (yellow) or new
					ones (green). Remove any you don’t want, or type below to add more.
				</p>
			</div>
			<ListingTagsEditor {...props} />
		</section>
	);
}
