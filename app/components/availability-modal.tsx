'use client';

import { useEffect, useMemo, useState } from 'react';
import { DayPilot } from '@daypilot/daypilot-lite-react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { dayPilotEndToModalInclusive } from '@/lib/attendance/adapters';
import { cn } from '@/lib/utils';

type FormMode = 'edit' | 'add';

type AvailabilityModalProps = {
	open: boolean;
	userEvents: DayPilot.EventData[];
	defaultTitle: string;
	/** When set, open with this event loaded in the yellow edit form. */
	initialEventId?: string | null;
	onDiscard: () => void;
	onSave: (payload: {
		eventId: string | null;
		startValue: string;
		endValue: string;
		title: string;
		note: string;
	}) => void;
};

function toInputDate(value: string | DayPilot.Date) {
	return new DayPilot.Date(value).toString('yyyy-MM-dd');
}

function formatDisplayDate(value: string | DayPilot.Date) {
	return new DayPilot.Date(value).toString('d MMM yyyy');
}

function isMarkedForDeletion(event: DayPilot.EventData) {
	return event.tags?.markedForDeletion === true;
}

function getEventTitle(event: DayPilot.EventData) {
	const fromTags = event.tags?.title;
	if (typeof fromTags === 'string' && fromTags.length > 0) {
		return fromTags;
	}
	return String(event.text ?? '');
}

function getEventNote(event: DayPilot.EventData) {
	const note = event.tags?.note;
	return typeof note === 'string' ? note : '';
}

export function AvailabilityModal({
	open,
	userEvents,
	defaultTitle,
	initialEventId = null,
	onDiscard,
	onSave
}: AvailabilityModalProps) {
	const [formMode, setFormMode] = useState<FormMode | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [startValue, setStartValue] = useState('');
	const [endValue, setEndValue] = useState('');
	const [titleValue, setTitleValue] = useState('');
	const [noteValue, setNoteValue] = useState('');
	const [formError, setFormError] = useState<string | null>(null);

	const listEvents = useMemo(
		() =>
			[...userEvents]
				.filter(event => !isMarkedForDeletion(event))
				.sort(
					(a, b) =>
						new DayPilot.Date(a.start).getTotalTicks() -
						new DayPilot.Date(b.start).getTotalTicks()
				),
		[userEvents]
	);

	useEffect(() => {
		if (!open) {
			return;
		}
		setFormError(null);
		if (initialEventId != null) {
			const event = userEvents.find(
				item => String(item.id) === String(initialEventId)
			);
			if (event && !isMarkedForDeletion(event)) {
				setFormMode('edit');
				setEditingId(String(event.id));
				setStartValue(toInputDate(event.start));
				setEndValue(dayPilotEndToModalInclusive(event.end));
				setTitleValue(getEventTitle(event));
				setNoteValue(getEventNote(event));
				return;
			}
		}
		setFormMode(null);
		setEditingId(null);
		setStartValue('');
		setEndValue('');
		setTitleValue('');
		setNoteValue('');
	}, [open, initialEventId, userEvents]);

	const loadEvent = (event: DayPilot.EventData) => {
		setFormMode('edit');
		setEditingId(String(event.id));
		setStartValue(toInputDate(event.start));
		setEndValue(dayPilotEndToModalInclusive(event.end));
		setTitleValue(getEventTitle(event));
		setNoteValue(getEventNote(event));
		setFormError(null);
	};

	const startAdd = () => {
		setFormMode('add');
		setEditingId(null);
		setStartValue('');
		setEndValue('');
		setTitleValue(defaultTitle);
		setNoteValue('');
		setFormError(null);
	};

	const handleSave = () => {
		if (formMode == null) {
			return;
		}
		if (!startValue || !endValue) {
			setFormError('Choose both a start and end date.');
			return;
		}
		const startDate = new DayPilot.Date(startValue);
		const endDate = new DayPilot.Date(endValue);
		if (endDate.getTotalTicks() < startDate.getTotalTicks()) {
			setFormError('End date must be on or after the start date.');
			return;
		}
		if (formMode === 'edit' && editingId == null) {
			setFormError('Select an existing availability to update.');
			return;
		}
		onSave({
			eventId: formMode === 'add' ? null : editingId,
			startValue,
			endValue,
			title: titleValue,
			note: noteValue
		});
	};

	const formVisible = formMode != null;
	const formHeading =
		formMode === 'add' ? 'Add a new availability' : 'Edit availability';
	const formDescription =
		formMode === 'add'
			? 'Fill in the dates, a short title, and an optional note for your new stay.'
			: 'Adjust the dates, title, or note, then save your changes.';

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) {
					onDiscard();
				}
			}}
		>
			<DialogContent
				className="sm:max-w-xl"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>Manage availability</DialogTitle>
					<DialogDescription>
						Edit an existing stay with the pencil rows, or use the plus row to
						add a new one.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="grid gap-1.5">
						<p className="text-sm font-medium">Your availabilities</p>
						<div className="max-h-64 overflow-y-auto rounded-lg border border-border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-10 p-0" />
										<TableHead>Title</TableHead>
										<TableHead>Start</TableHead>
										<TableHead>End</TableHead>
										<TableHead>Note</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{listEvents.map(event => {
										const id = String(event.id);
										const selected =
											formMode === 'edit' && editingId === id;
										const note = getEventNote(event);
										return (
											<TableRow
												key={id}
												data-state={selected ? 'selected' : undefined}
												className={cn(
													'group cursor-pointer border-border',
													'hover:bg-[#fff6dc]',
													selected && 'bg-[#fff6dc]'
												)}
												onClick={() => loadEvent(event)}
											>
												<TableCell
													className={cn(
														'w-10 p-0 text-center',
														'bg-[#fff6dc]',
														'group-hover:bg-[#fff6dc]'
													)}
												>
													<span className="inline-flex size-full min-h-10 items-center justify-center text-[#8a5a12]">
														<Pencil
															className="size-3.5"
															aria-hidden
														/>
														<span className="sr-only">Edit</span>
													</span>
												</TableCell>
												<TableCell className="max-w-36 truncate font-medium">
													{getEventTitle(event)}
												</TableCell>
												<TableCell>
													{formatDisplayDate(event.start)}
												</TableCell>
												<TableCell>
													{formatDisplayDate(
														dayPilotEndToModalInclusive(event.end)
													)}
												</TableCell>
												<TableCell className="max-w-44 truncate text-muted-foreground">
													{note || '—'}
												</TableCell>
											</TableRow>
										);
									})}
									{formMode !== 'add' ? (
										<TableRow
											className={cn(
												'group cursor-pointer border-border',
												'hover:bg-[#e5f2e9]'
											)}
											onClick={startAdd}
										>
											<TableCell
												className={cn(
													'w-10 p-0 text-center',
													'bg-[#e5f2e9]',
													'group-hover:bg-[#e5f2e9]'
												)}
											>
												<span className="inline-flex size-full min-h-10 items-center justify-center text-[#2f6b45]">
													<Plus
														className="size-4"
														aria-hidden
													/>
													<span className="sr-only">Add availability</span>
												</span>
											</TableCell>
											<TableCell
												colSpan={4}
												className="text-sm text-muted-foreground"
											>
												Add a new availability
											</TableCell>
										</TableRow>
									) : null}
								</TableBody>
							</Table>
						</div>
					</div>

					{formVisible ? (
						<div
							className={cn(
								'grid gap-4 rounded-lg border p-3',
								formMode === 'add'
									? 'border-[#3d8b5a]/40 bg-[#e5f2e9]'
									: 'border-[#d4a017]/40 bg-[#fff6dc]'
							)}
						>
							<div className="grid gap-1">
								<p className="text-sm font-medium">{formHeading}</p>
								<p className="text-sm text-muted-foreground">
									{formDescription}
								</p>
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<div className="grid gap-1.5">
									<Label htmlFor="availability-start">Start date</Label>
									<Input
										id="availability-start"
										type="date"
										value={startValue}
										max={endValue || undefined}
										onChange={event => setStartValue(event.target.value)}
										className="bg-background"
									/>
								</div>
								<div className="grid gap-1.5">
									<Label htmlFor="availability-end">End date</Label>
									<Input
										id="availability-end"
										type="date"
										value={endValue}
										min={startValue || undefined}
										onChange={event => setEndValue(event.target.value)}
										className="bg-background"
									/>
								</div>
							</div>

							<div className="grid gap-1.5">
								<Label htmlFor="availability-title">Title</Label>
								<Input
									id="availability-title"
									type="text"
									value={titleValue}
									placeholder={defaultTitle || 'e.g. Son is visiting'}
									onChange={event => setTitleValue(event.target.value)}
									className="bg-background"
								/>
							</div>

							<div className="grid gap-1.5">
								<Label htmlFor="availability-note">Note</Label>
								<Textarea
									id="availability-note"
									value={noteValue}
									placeholder="Longer description of the stay…"
									onChange={event => setNoteValue(event.target.value)}
									className="min-h-20 bg-background"
								/>
							</div>

							{formError ? (
								<p
									className="text-sm text-destructive"
									role="alert"
								>
									{formError}
								</p>
							) : null}
						</div>
					) : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onDiscard}
					>
						Discard
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={!formVisible}
					>
						Save
					</Button>
				</DialogFooter>
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
