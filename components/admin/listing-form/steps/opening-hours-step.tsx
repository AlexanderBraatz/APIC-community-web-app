'use client';

import OpeningHoursEditor from '@/components/admin/listing-form/opening-hours-editor';
import { Button } from '@/components/ui/button';
import {
	openingHoursToFormState,
	type OpeningHoursFormState
} from '@/lib/listings/opening-hours';

type OpeningHoursStepProps = {
	hours: OpeningHoursFormState;
	showHours: boolean;
	onHoursChange: (hours: OpeningHoursFormState) => void;
	onShowHoursChange: (show: boolean) => void;
};

export default function OpeningHoursStep({
	hours,
	showHours,
	onHoursChange,
	onShowHoursChange
}: OpeningHoursStepProps) {
	function handleOpeningHoursToggle() {
		if (showHours) {
			onHoursChange(openingHoursToFormState(null));
			onShowHoursChange(false);
			return;
		}
		onShowHoursChange(true);
	}

	return (
		<section className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className="text-sm font-medium text-[#444]">Opening hours</h3>
					<p className="text-xs text-[#888]">
						{showHours
							? 'Optional weekly schedule for this recommendation.'
							: 'Optional — expand to edit, or leave blank until autofilled from business lookup.'}
					</p>
				</div>
				<Button
					type="button"
					variant="secondary"
					onClick={handleOpeningHoursToggle}
					aria-expanded={showHours}
				>
					{showHours ? 'Remove opening hours' : 'Add opening hours'}
				</Button>
			</div>
			{showHours ? (
				<OpeningHoursEditor
					hours={hours}
					onChange={onHoursChange}
				/>
			) : null}
		</section>
	);
}
