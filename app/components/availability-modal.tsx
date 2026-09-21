'use client';

import { useEffect, useMemo, useState } from 'react';
import { DayPilot } from '@daypilot/daypilot-lite-react';
import { Pencil, Plus, Search, X } from 'lucide-react';
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
import { DatePickerField } from '@/components/ui/date-picker-field';
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
import {
	fuzzyMatch,
	normalizeSearchText
} from '@/lib/attendance/member-search';
import { cn } from '@/lib/utils';

type FormMode = 'edit' | 'add';

export type AvailabilityMemberOption = {
	id: string;
	name: string;
};

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

function toInputDate(value: string | DayPilot.Date) {
	return new DayPilot.Date(value).toString('yyyy-MM-dd');
}

function formatDisplayDate(value: string | DayPilot.Date) {
	return new DayPilot.Date(value).toString('d MMM yyyy');
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
	const [formMode, setFormMode] = useState<FormMode | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [startValue, setStartValue] = useState('');
	const [endValue, setEndValue] = useState('');
	const [titleValue, setTitleValue] = useState('');
	const [noteValue, setNoteValue] = useState('');
	const [formError, setFormError] = useState<string | null>(null);
	const [memberQuery, setMemberQuery] = useState('');
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	const editingOther =
		isAdmin &&
		targetUserId != null &&
		currentUserId != null &&
		targetUserId !== currentUserId;

	const listEvents = useMemo(
		() =>
			[...userEvents].sort(
				(a, b) =>
					new DayPilot.Date(a.start).getTotalTicks() -
					new DayPilot.Date(b.start).getTotalTicks()
			),
		[userEvents]
	);

	const memberSuggestions = useMemo(() => {
		if (!isAdmin || !normalizeSearchText(memberQuery)) {
			return [];
		}
		return members
			.filter(
				member =>
					member.id !== targetUserId &&
					fuzzyMatch(memberQuery, member.name)
			)
			.slice(0, 8);
	}, [isAdmin, memberQuery, members, targetUserId]);

	const highlightedSuggestionIndex =
		memberSuggestions.length === 0
			? 0
			: Math.min(activeSuggestionIndex, memberSuggestions.length - 1);
	const highlightedSuggestion = memberSuggestions[highlightedSuggestionIndex];

	const resetForm = () => {
		setFormMode(null);
		setEditingId(null);
		setStartValue('');
		setEndValue('');
		setTitleValue('');
		setNoteValue('');
		setFormError(null);
		setDeleteConfirmOpen(false);
	};

	useEffect(() => {
		if (!open) {
			return;
		}
		setFormError(null);
		if (initialEventId != null) {
			const event = userEvents.find(
				item => String(item.id) === String(initialEventId)
			);
			if (event) {
				setFormMode('edit');
				setEditingId(String(event.id));
				setStartValue(toInputDate(event.start));
				setEndValue(dayPilotEndToModalInclusive(event.end));
				setTitleValue(getEventTitle(event));
				setNoteValue(getEventNote(event));
				return;
			}
		}
		resetForm();
	}, [open, initialEventId, userEvents]);

	useEffect(() => {
		setMemberQuery('');
		setActiveSuggestionIndex(0);
	}, [open, targetUserId]);

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

	const selectMember = (memberId: string) => {
		onSelectMember?.(memberId);
		setMemberQuery('');
		setActiveSuggestionIndex(0);
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
			setFormError('Select an existing attendance to update.');
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

	const handleDelete = () => {
		if (formMode !== 'edit' || editingId == null) {
			return;
		}
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = () => {
		if (editingId == null) {
			return;
		}
		setDeleteConfirmOpen(false);
		onDelete(editingId);
	};

	const editOtherAvailability = () => {
		resetForm();
	};

	const formVisible = formMode != null;
	const focusingEdit = formMode === 'edit' && editingId != null;
	const focusingAdd = formMode === 'add';
	const visibleListEvents = useMemo(() => {
		if (focusingEdit) {
			return listEvents.filter(event => String(event.id) === editingId);
		}
		if (focusingAdd) {
			return [];
		}
		return listEvents;
	}, [listEvents, focusingEdit, focusingAdd, editingId]);
	const formHeading =
		formMode === 'add' ? 'Add a new attendance' : 'Edit attendance';
	const formDescription =
		formMode === 'add'
			? editingOther
				? `Fill in the dates, a short title, and an optional note for ${targetMemberName}'s new stay.`
				: 'Fill in the dates, a short title, and an optional note for your new stay.'
			: 'Adjust the dates, title, or note, then save your changes. You can also delete this stay.';
	const listHeading = editingOther
		? `${targetMemberName}'s attendance`
		: 'Your attendance';

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={nextOpen => {
					if (!nextOpen) {
						setDeleteConfirmOpen(false);
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

				<div className="grid min-w-0 gap-4">
					{isAdmin ? (
						<div className="grid gap-2">
							<p className="text-sm font-medium">Member attendance</p>
							{editingOther ? (
								<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
									<p className="min-w-0 flex-1 truncate text-sm">
										Editing{' '}
										<span className="font-medium">{targetMemberName}</span>
									</p>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 shrink-0 gap-1 px-2"
										onClick={() => onClearMember?.()}
									>
										<X
											className="size-3.5"
											aria-hidden
										/>
										Clear
									</Button>
								</div>
							) : null}
							<div className="relative">
								<div className="relative">
									<Search
										aria-hidden
										className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
									/>
									<Input
										id="availability-member-search"
										type="search"
										value={memberQuery}
										placeholder="Find people"
										aria-label="Find member to edit attendance"
										aria-autocomplete="list"
										aria-controls={
											memberSuggestions.length > 0
												? 'availability-member-suggestions'
												: undefined
										}
										aria-expanded={memberSuggestions.length > 0}
										aria-activedescendant={
											highlightedSuggestion
												? `availability-member-option-${highlightedSuggestion.id}`
												: undefined
										}
										onChange={event => {
											setMemberQuery(event.target.value);
											setActiveSuggestionIndex(0);
										}}
										onKeyDown={event => {
											if (memberSuggestions.length === 0) {
												return;
											}
											if (event.key === 'ArrowDown') {
												event.preventDefault();
												setActiveSuggestionIndex(index =>
													Math.min(index + 1, memberSuggestions.length - 1)
												);
												return;
											}
											if (event.key === 'ArrowUp') {
												event.preventDefault();
												setActiveSuggestionIndex(index =>
													Math.max(index - 1, 0)
												);
												return;
											}
											if (event.key !== 'Enter' || !highlightedSuggestion) {
												return;
											}
											event.preventDefault();
											selectMember(highlightedSuggestion.id);
										}}
										className="h-11 bg-muted pl-8"
									/>
								</div>
								{memberSuggestions.length > 0 ? (
									<ul
										id="availability-member-suggestions"
										role="listbox"
										aria-label="Member suggestions"
										className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-md"
									>
										{memberSuggestions.map((member, index) => {
											const active = index === highlightedSuggestionIndex;
											return (
												<li
													key={member.id}
													id={`availability-member-option-${member.id}`}
													role="option"
													aria-selected={active}
												>
													<button
														type="button"
														onClick={() => selectMember(member.id)}
														onMouseEnter={() =>
															setActiveSuggestionIndex(index)
														}
														className={cn(
															'flex w-full px-3 py-2 text-left text-sm',
															active
																? 'bg-muted text-foreground'
																: 'text-foreground hover:bg-muted/70'
														)}
													>
														{member.name}
													</button>
												</li>
											);
										})}
									</ul>
								) : null}
							</div>
						</div>
					) : null}

					<div className="grid gap-1.5">
						<p className="text-sm font-medium">{listHeading}</p>
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
									{visibleListEvents.map(event => {
										const id = String(event.id);
										const selected =
											formMode === 'edit' && editingId === id;
										const note = getEventNote(event);
										return (
											<TableRow
												key={id}
												data-state={selected ? 'selected' : undefined}
												className={cn(
													'group border-border',
													selected
														? 'bg-[#fff6dc]'
														: 'cursor-pointer hover:bg-[#fff6dc]'
												)}
												onClick={
													selected ? undefined : () => loadEvent(event)
												}
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
														<span className="sr-only">
															{selected ? 'Editing' : 'Edit'}
														</span>
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
									{!formVisible ? (
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
													<span className="sr-only">Add attendance</span>
												</span>
											</TableCell>
											<TableCell
												colSpan={4}
												className="text-sm text-muted-foreground"
											>
												Add a new attendance
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
								'grid min-w-0 gap-4 rounded-lg border p-3',
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
									<DatePickerField
										id="availability-start"
										value={startValue}
										max={endValue || undefined}
										onChange={setStartValue}
										className="bg-background"
									/>
								</div>
								<div className="grid gap-1.5">
									<Label htmlFor="availability-end">End date</Label>
									<DatePickerField
										id="availability-end"
										value={endValue}
										min={startValue || undefined}
										onChange={setEndValue}
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
					{formMode === 'edit' && editingId != null ? (
						<Button
							type="button"
							variant="destructive"
							onClick={handleDelete}
							className="sm:mr-auto"
						>
							Delete
						</Button>
					) : null}
					{formVisible ? (
						<Button
							type="button"
							variant="outline"
							onClick={editOtherAvailability}
						>
							Edit other availability
						</Button>
					) : null}
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
			<Dialog
				open={deleteConfirmOpen}
				onOpenChange={setDeleteConfirmOpen}
			>
				<DialogContent
					className="sm:max-w-md"
					showCloseButton={false}
				>
					<DialogHeader>
						<DialogTitle>Delete stay?</DialogTitle>
						<DialogDescription>
							{titleValue.trim()
								? `This permanently removes “${titleValue.trim()}” from the attendance calendar. This cannot be undone.`
								: 'This permanently removes this stay from the attendance calendar. This cannot be undone.'}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteConfirmOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={confirmDelete}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
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
