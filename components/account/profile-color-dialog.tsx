'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfileColor } from '@/lib/account/actions';
import { EVENT_BAR_PALETTE } from '@/lib/attendance/event-bar-palette';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';

type ProfileColorDialogProps = {
	currentColor: string | null;
};

export function ProfileColorDialog({ currentColor }: ProfileColorDialogProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draftColor, setDraftColor] = useState(currentColor);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function openDialog() {
		setDraftColor(currentColor);
		setError(null);
		setOpen(true);
	}

	function closeDialog() {
		if (pending) return;
		setOpen(false);
		setDraftColor(currentColor);
		setError(null);
	}

	function save() {
		if (!draftColor) {
			setError('Choose a colour from the palette.');
			return;
		}
		startTransition(async () => {
			setError(null);
			const result = await updateProfileColor(draftColor);
			if (result.error) {
				setError(result.error);
				return;
			}
			setOpen(false);
			router.replace('/account?message=Profile%20colour%20updated.');
			router.refresh();
		});
	}

	return (
		<>
			<Button type="button" onClick={openDialog}>
				Change colour
			</Button>

			<Dialog
				open={open}
				onOpenChange={nextOpen => {
					if (!nextOpen) closeDialog();
					else openDialog();
				}}
			>
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Change profile colour</DialogTitle>
						<DialogDescription>
							Choose the colour shown behind your profile initial.
						</DialogDescription>
					</DialogHeader>

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
									disabled={pending}
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

					{error ? (
						<p
							className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
							role="alert"
						>
							{error}
						</p>
					) : null}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={closeDialog}
							disabled={pending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={save}
							loading={pending}
							disabled={!draftColor || draftColor === currentColor}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
