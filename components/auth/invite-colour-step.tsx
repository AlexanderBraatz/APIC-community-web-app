'use client';

import { useState } from 'react';
import { setInviteColour } from '@/lib/invitations/actions';
import { EVENT_BAR_PALETTE } from '@/lib/attendance/event-bar-palette';
import { SubmitButton } from '@/components/ui/submit-button';

type Props = {
	error?: string;
	currentColor?: string | null;
};

export function InviteColourStep({ error, currentColor = null }: Props) {
	const [draftColor, setDraftColor] = useState<string | null>(currentColor);

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Choose your colour
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				This colour appears behind your profile initial and on your attendance
				bars so others can spot you on the calendar.
			</p>

			{error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}

			<form action={setInviteColour} className="mt-8 space-y-6">
				<input type="hidden" name="color" value={draftColor ?? ''} />

				<div
					role="radiogroup"
					aria-label="Profile colour"
					className="flex flex-wrap gap-2"
				>
					{EVENT_BAR_PALETTE.map(color => {
						const selected = draftColor === color;
						return (
							<button
								key={color}
								type="button"
								role="radio"
								aria-checked={selected}
								aria-label={`Profile colour ${color}`}
								title={color}
								onClick={() => setDraftColor(color)}
								className={`size-8 rounded-full border-2 transition-[box-shadow,transform] ${
									selected
										? 'scale-105 border-[#333] shadow-sm'
										: 'border-transparent hover:scale-105'
								}`}
								style={{ background: color }}
							/>
						);
					})}
				</div>

				<SubmitButton className="w-full" disabled={!draftColor}>
					Continue
				</SubmitButton>
			</form>
		</main>
	);
}
