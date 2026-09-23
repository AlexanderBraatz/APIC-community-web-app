'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateProfileColor } from '@/lib/account/actions';
import { EVENT_BAR_PALETTE } from '@/lib/attendance/event-bar-palette';
import { buttonVariants } from '@/components/ui/button-variants';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/utils';

type Props = {
	currentColor: string | null;
};

export function ProfileColorForm({ currentColor }: Props) {
	const [draftColor, setDraftColor] = useState(currentColor);

	return (
		<form action={updateProfileColor} className="space-y-6">
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

			<div className="flex flex-wrap gap-3">
				<SubmitButton
					className="w-full sm:w-auto"
					disabled={!draftColor || draftColor === currentColor}
				>
					Confirm change colour
				</SubmitButton>
				<Link
					href="/account"
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'w-full sm:w-auto'
					)}
				>
					Cancel
				</Link>
			</div>
		</form>
	);
}
