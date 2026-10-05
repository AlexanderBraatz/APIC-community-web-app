'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TypeNameStepProps = {
	type: string;
	name: string;
	onTypeChange: (type: string) => void;
	onNameChange: (name: string) => void;
};

export default function TypeNameStep({
	type,
	name,
	onTypeChange,
	onNameChange
}: TypeNameStepProps) {
	return (
		<section className="space-y-6">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Type & name</h3>
				<p className="mt-1 text-xs text-[#888]">
					Set how this recommendation is labeled for members.
				</p>
			</div>
			<div className="space-y-6">
				<div className="space-y-2">
					<Label htmlFor="step-name">Name</Label>
					<p className="text-xs text-[#888]">
						This is the title members see on the recommendation card and in
						search results.
					</p>
					<Input
						id="step-name"
						value={name}
						onChange={e => onNameChange(e.target.value)}
						maxLength={300}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="step-type">Business type</Label>
					<p className="text-xs text-[#888]">
						A short label for what the place is (for example, trattoria or
						pharmacy) shown alongside the name.
					</p>
					<Input
						id="step-type"
						value={type}
						onChange={e => onTypeChange(e.target.value)}
					/>
				</div>
			</div>
		</section>
	);
}
