'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ApicDescriptionStepProps = {
	notes: string;
	onChange: (notes: string) => void;
};

export default function ApicDescriptionStep({
	notes,
	onChange
}: ApicDescriptionStepProps) {
	return (
		<section className="space-y-4">
			<div>
				<h3 className="text-sm font-medium text-[#444]">APIC description</h3>
				<p className="mt-1 text-xs text-[#888]">
					This text is shown to members on the listing card.
				</p>
			</div>
			<div className="space-y-2">
				<Label htmlFor="step-notes">APIC description</Label>
				<Textarea
					id="step-notes"
					value={notes}
					onChange={e => onChange(e.target.value)}
					rows={6}
				/>
			</div>
		</section>
	);
}
