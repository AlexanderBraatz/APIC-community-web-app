'use client';

import { useState } from 'react';
import { DayPilot } from '@daypilot/daypilot-lite-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import {
	AttendanceEditor,
	formatDisplayDate,
	getEventNote,
	getEventTitle,
	type AvailabilityMemberOption
} from '@/app/components/attendance-editor';
import { dayPilotEndToModalInclusive } from '@/lib/attendance/adapters';

export type { AvailabilityMemberOption };

type AvailabilityModalProps = {
	open: boolean;
	userEvents: DayPilot.EventData[];
	defaultTitle: string;
	/** When set, open with this event loaded in the yellow edit form. */
	initialEventId?: string | null;
	isAdmin?: boolean;
	members?: AvailabilityMemberOption[];
	currentUserId?: string;
	targetUserId?: string;
	targetMemberName?: string;
	onSelectMember?: (memberId: string) => void;
	onClearMember?: () => void;
	onClose: () => void;
	onSave: (payload: {
		eventId: string | null;
		startValue: string;
		endValue: string;
		title: string;
		note: string;
	}) => void;
	onDelete: (eventId: string) => void;
};

export function AvailabilityModal({
	open,
	userEvents,
	defaultTitle,
	initialEventId = null,
	isAdmin = false,
	members = [],
	currentUserId,
	targetUserId,
	targetMemberName = '',
	onSelectMember,
	onClearMember,
	onClose,
	onSave,
	onDelete
}: AvailabilityModalProps) {
	const [formMode, setFormMode] = useState<'edit' | 'add' | null>(null);
	const formVisible = formMode != null;
	const focusingEdit = formMode === 'edit';
	const editingOther =
		isAdmin &&
		targetUserId != null &&
		currentUserId != null &&
		targetUserId !== currentUserId;

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) {
					onClose();
				}
			}}
		>
			<DialogContent
				className="sm:max-w-xl"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>Manage attendance</DialogTitle>
					<DialogDescription>
						{formVisible
							? focusingEdit
								? 'You are editing one stay. Save to keep changes, or choose Edit other availability to pick a different stay without saving.'
								: 'You are adding a new stay. Save to keep it, or choose Edit other availability to go back to the list without saving.'
							: editingOther
								? `Editing stays for ${targetMemberName}. Use the pencil rows to edit, the plus row to add, or Delete in the edit form to remove a stay.`
								: 'Edit a stay with the pencil rows, use the plus row to add, or Delete in the edit form to remove a stay.'}
					</DialogDescription>
				</DialogHeader>

				<AttendanceEditor
					active={open}
					resetKey={
						open
							? `${targetUserId ?? ''}:${initialEventId ?? ''}`
							: false
					}
					userEvents={userEvents}
					defaultTitle={defaultTitle}
					initialEventId={initialEventId}
					isAdmin={isAdmin}
					members={members}
					currentUserId={currentUserId}
					targetUserId={targetUserId}
					targetMemberName={targetMemberName}
					onSelectMember={onSelectMember}
					onClearMember={onClearMember}
					onSave={onSave}
					onDelete={onDelete}
					onFormModeChange={setFormMode}
					actionsAsDialogFooter
				/>
			</DialogContent>
		</Dialog>
	);
}

type ReadOnlyAvailabilityModalProps = {
	open: boolean;
	event: DayPilot.EventData;
	memberName: string;
	onClose: () => void;
};

export function ReadOnlyAvailabilityModal({
	open,
	event,
	memberName,
	onClose
}: ReadOnlyAvailabilityModalProps) {
	const title = getEventTitle(event);
	const note = getEventNote(event);

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) {
					onClose();
				}
			}}
		>
			<DialogContent
				className="sm:max-w-md"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{memberName}
						{' · '}
						{formatDisplayDate(event.start)}
						{' – '}
						{formatDisplayDate(dayPilotEndToModalInclusive(event.end))}
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border border-border bg-muted/50 p-4">
					<p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Note
					</p>
					{note ? (
						<p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
							{note}
						</p>
					) : (
						<p className="text-sm text-muted-foreground italic">
							No note for this stay.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
