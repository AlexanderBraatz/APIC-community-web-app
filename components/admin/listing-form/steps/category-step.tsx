'use client';

import { Label } from '@/components/ui/label';
import {
	CATEGORY_LABELS,
	CATEGORY_SLUGS
} from '@/components/admin/listing-form/constants';
import { isCategorySlug } from '@/lib/listings/types';
import type { CategorySlug } from '@/lib/listings-search';

type CategoryStepProps = {
	category: string;
	onChange: (category: CategorySlug | '') => void;
};

export default function CategoryStep({ category, onChange }: CategoryStepProps) {
	return (
		<section className="space-y-4">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Select category</h3>
				<p className="mt-1 text-xs text-[#888]">
					Choose where this listing will appear before looking up a place.
				</p>
			</div>
			<div className="space-y-2">
				<Label htmlFor="step-category">Category</Label>
				<select
					id="step-category"
					value={category}
					onChange={e => {
						const value = e.target.value;
						onChange(isCategorySlug(value) ? value : '');
					}}
					className="h-9 w-full max-w-md rounded-lg border border-input bg-transparent px-2.5 text-sm"
				>
					<option value="">Select a category…</option>
					{CATEGORY_SLUGS.map(slug => (
						<option
							key={slug}
							value={slug}
						>
							{CATEGORY_LABELS[slug]}
						</option>
					))}
				</select>
			</div>
		</section>
	);
}
