'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	CATEGORY_LABELS,
	CATEGORY_SLUGS
} from '@/components/admin/listing-form/constants';
import { isCategorySlug } from '@/lib/listings/types';
import type { CategorySlug } from '@/lib/listings-search';

type TypeNameStepProps = {
	category: string;
	type: string;
	name: string;
	onCategoryChange: (category: CategorySlug | '') => void;
	onTypeChange: (type: string) => void;
	onNameChange: (name: string) => void;
};

export default function TypeNameStep({
	category,
	type,
	name,
	onCategoryChange,
	onTypeChange,
	onNameChange
}: TypeNameStepProps) {
	return (
		<section className="space-y-4">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Type & name</h3>
				<p className="mt-1 text-xs text-[#888]">
					Confirm the category and set how this place is labeled for members.
				</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="step-type-category">Category</Label>
					<select
						id="step-type-category"
						value={category}
						onChange={e => {
							const value = e.target.value;
							onCategoryChange(isCategorySlug(value) ? value : '');
						}}
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
				<div className="space-y-2">
					<Label htmlFor="step-type">Place type (what it is)</Label>
					<Input
						id="step-type"
						value={type}
						onChange={e => onTypeChange(e.target.value)}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="step-name">Name</Label>
					<Input
						id="step-name"
						value={name}
						onChange={e => onNameChange(e.target.value)}
						maxLength={300}
					/>
				</div>
			</div>
		</section>
	);
}
