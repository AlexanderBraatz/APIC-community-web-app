'use client';

import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LocationIntroStepProps = {
	hasLocation: boolean;
	onAddOrChange: () => void;
	onRemoveAndSkip: () => void;
	disabled?: boolean;
};

export default function LocationIntroStep({
	hasLocation,
	onAddOrChange,
	onRemoveAndSkip,
	disabled = false
}: LocationIntroStepProps) {
	return (
		<section className="mx-auto flex max-w-lg flex-col items-center gap-8 py-6 text-center">
			<span
				className="flex size-14 items-center justify-center rounded-full border border-[#b8a99a]/50 bg-[#f7f2ec] text-[#805b32]"
				aria-hidden="true"
			>
				<MapPin className="size-7" />
			</span>

			<div className="space-y-3">
				<h2 className="text-xl font-medium tracking-tight text-[#2c2c2c]">
					{hasLocation
						? 'This article already has a map'
						: 'Add a map to this article?'}
				</h2>
				<p className="text-sm leading-relaxed text-[#666]">
					{hasLocation
						? 'Change the location, or remove it and continue without a map.'
						: 'An article map is optional. Add a location if readers should see where this story takes place, or skip and continue writing.'}
				</p>
			</div>

			<div className="grid w-full grid-cols-2 gap-3">
				<Button
					type="button"
					onClick={onAddOrChange}
					disabled={disabled}
					className="w-full"
				>
					{hasLocation ? 'Change location' : 'Add Location'}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onRemoveAndSkip}
					disabled={disabled}
					className="w-full"
				>
					{hasLocation ? 'Remove and skip' : 'Skip Location'}
				</Button>
			</div>
		</section>
	);
}
