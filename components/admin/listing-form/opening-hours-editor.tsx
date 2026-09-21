'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	DAY_KEYS,
	DAY_LABELS,
	dayHoursValidationMessage,
	type DayFormState,
	type DayFormStatus,
	type DayKey,
	type OpeningHoursFormState
} from '@/lib/listings/opening-hours';

function updateDay(
	state: OpeningHoursFormState,
	day: DayKey,
	patch: Partial<DayFormState>
): OpeningHoursFormState {
	return {
		...state,
		days: {
			...state.days,
			[day]: { ...state.days[day], ...patch }
		}
	};
}

type OpeningHoursEditorProps = {
	hours: OpeningHoursFormState;
	onChange: (hours: OpeningHoursFormState) => void;
};

function TimeRangeInputs({
	dayLabel,
	periodLabel,
	open,
	close,
	onOpenChange,
	onCloseChange,
	invalid
}: {
	dayLabel: string;
	periodLabel: string;
	open: string;
	close: string;
	onOpenChange: (value: string) => void;
	onCloseChange: (value: string) => void;
	invalid?: boolean;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Input
				type="time"
				step={300}
				aria-label={`${dayLabel} ${periodLabel} opens`}
				aria-invalid={invalid || undefined}
				value={open}
				onChange={e => onOpenChange(e.target.value)}
				className="h-8 w-[9.5rem]"
			/>
			<span className="text-xs text-[#888]">to</span>
			<Input
				type="time"
				step={300}
				aria-label={`${dayLabel} ${periodLabel} closes`}
				aria-invalid={invalid || undefined}
				value={close}
				onChange={e => onCloseChange(e.target.value)}
				className="h-8 w-[9.5rem]"
			/>
		</div>
	);
}

export default function OpeningHoursEditor({
	hours,
	onChange
}: OpeningHoursEditorProps) {
	function setStatus(day: DayKey, status: DayFormStatus) {
		if (status === 'unset' || status === 'closed') {
			onChange(
				updateDay(hours, day, {
					status,
					open1: '',
					close1: '',
					open2: '',
					close2: ''
				})
			);
			return;
		}
		if (status === 'open') {
			onChange(
				updateDay(hours, day, {
					status,
					open2: '',
					close2: ''
				})
			);
			return;
		}
		onChange(updateDay(hours, day, { status }));
	}

	return (
		<div className="space-y-3">
			<p className="text-xs text-[#888]">
				Choose Open without lunch break for one continuous period, or Open with
				lunch break when the business closes midday and reopens.
			</p>
			<div className="overflow-x-auto border border-[#b8a99a]/40">
				<table className="w-full min-w-[36rem] border-collapse text-sm">
					<thead>
						<tr className="border-b border-[#b8a99a]/40 bg-[#f7f4ef] text-left text-xs text-[#666]">
							<th className="px-3 py-2 font-medium">Day</th>
							<th className="px-3 py-2 font-medium">Status</th>
							<th className="px-3 py-2 font-medium">Hours</th>
						</tr>
					</thead>
					<tbody>
						{DAY_KEYS.map(day => {
							const row = hours.days[day];
							const label = DAY_LABELS[day];
							const error = dayHoursValidationMessage(row);
							const hasLunch = row.status === 'open_lunch';
							const isOpen = row.status === 'open' || hasLunch;

							return (
								<tr
									key={day}
									className="border-b border-[#b8a99a]/30 align-top last:border-b-0"
								>
									<td className="px-3 py-2.5 font-medium text-[#444]">
										{label}
									</td>
									<td className="px-3 py-2.5">
										<select
											aria-label={`${label} status`}
											value={row.status}
											onChange={e =>
												setStatus(day, e.target.value as DayFormStatus)
											}
											className="h-8 w-full min-w-[11rem] rounded-lg border border-input bg-transparent px-2.5 text-sm"
										>
											<option value="unset">Not set</option>
											<option value="open">Open</option>
											<option value="open_lunch">Open with lunch break</option>
											<option value="closed">Closed</option>
										</select>
									</td>
									<td className="px-3 py-2.5">
										{row.status === 'closed' ? (
											<p className="text-xs text-[#888]">Closed all day</p>
										) : isOpen ? (
											<div className="space-y-2">
												<div className="space-y-1">
													{hasLunch ? (
														<p className="text-[11px] font-medium uppercase tracking-wide text-[#999]">
															Before lunch
														</p>
													) : null}
													<TimeRangeInputs
														dayLabel={label}
														periodLabel={hasLunch ? 'before lunch' : 'hours'}
														open={row.open1}
														close={row.close1}
														invalid={Boolean(error)}
														onOpenChange={value =>
															onChange(updateDay(hours, day, { open1: value }))
														}
														onCloseChange={value =>
															onChange(updateDay(hours, day, { close1: value }))
														}
													/>
												</div>
												{hasLunch ? (
													<div className="space-y-1">
														<p className="text-[11px] font-medium uppercase tracking-wide text-[#999]">
															After lunch
														</p>
														<TimeRangeInputs
															dayLabel={label}
															periodLabel="after lunch"
															open={row.open2}
															close={row.close2}
															invalid={Boolean(error)}
															onOpenChange={value =>
																onChange(updateDay(hours, day, { open2: value }))
															}
															onCloseChange={value =>
																onChange(
																	updateDay(hours, day, { close2: value })
																)
															}
														/>
													</div>
												) : null}
												{error ? (
													<p className="text-xs text-red-700">{error}</p>
												) : null}
											</div>
										) : (
											<p className="text-xs text-[#bbb]">—</p>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div className="space-y-2">
				<Label htmlFor="step-hours-note">Hours note (optional)</Label>
				<Input
					id="step-hours-note"
					value={hours.note}
					onChange={e => onChange({ ...hours, note: e.target.value })}
					placeholder="By appointment only"
				/>
			</div>
		</div>
	);
}
