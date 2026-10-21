'use client';

import { useRef, useState } from 'react';
import { DayPilot } from '@daypilot/daypilot-lite-react';
import {
	AttendanceEditor,
	type AttendanceEditorHandle
} from '@/app/components/attendance-editor';
import { InviteOnboardingProgress } from '@/components/auth/invite-onboarding-progress';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveAttendanceBatch } from '@/lib/attendance/actions';
import {
	attendanceToEvent,
	eventToAttendanceStay,
	modalInclusiveEndToDayPilotEnd
} from '@/lib/attendance/adapters';
import type { AttendanceRow } from '@/lib/attendance/types';
import {
	continueInviteAttendance,
	skipInviteAttendance
} from '@/lib/invitations/actions';

type Props = {
	error?: string;
	currentUserId: string;
	defaultTitle: string;
	initialStays: AttendanceRow[];
};

export function InviteAttendanceStep({
	error,
	currentUserId,
	defaultTitle,
	initialStays
}: Props) {
	const editorRef = useRef<AttendanceEditorHandle>(null);
	const [events, setEvents] = useState<DayPilot.EventData[]>(() =>
		initialStays.map(attendanceToEvent)
	);
	const [formMode, setFormMode] = useState<'edit' | 'add' | null>(
		initialStays.length === 0 ? 'add' : null
	);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const formOpen = formMode != null;
	const showAfterSavePrompt = events.length > 0 && !formOpen && !saving;

	async function persist(
		nextEvents: DayPilot.EventData[],
		deleteIds: string[]
	) {
		const rows = await saveAttendanceBatch({
			stays: nextEvents.map(eventToAttendanceStay),
			deleteIds
		});
		const ownRows = rows.filter(row => row.user_id === currentUserId);
		setEvents(ownRows.map(attendanceToEvent));
	}

	async function handleSave(payload: {
		eventId: string | null;
		startValue: string;
		endValue: string;
		title: string;
		note: string;
	}) {
		setSaving(true);
		setSaveError(null);
		const title = payload.title.trim() || defaultTitle;
		const note = payload.note.trim();
		const start = `${payload.startValue}T00:00:00`;
		const end = modalInclusiveEndToDayPilotEnd(payload.endValue);
		const hadNoStays = events.length === 0;

		const nextEvents =
			payload.eventId == null
				? [
						...events,
						{
							id: crypto.randomUUID(),
							resource: currentUserId,
							start,
							end,
							text: title,
							tags: { title, note }
						}
					]
				: events.map(event =>
						String(event.id) === payload.eventId
							? {
									...event,
									start,
									end,
									text: title,
									tags: { title, note }
								}
							: event
					);

		try {
			await persist(nextEvents, []);
		} catch (err) {
			setSaveError(
				err instanceof Error ? err.message : 'Could not save attendance.'
			);
			// Editor already closed the form — reopen add if user still has no stays.
			if (hadNoStays) {
				editorRef.current?.startAdd();
			}
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(eventId: string) {
		setSaving(true);
		setSaveError(null);
		const nextEvents = events.filter(event => String(event.id) !== eventId);
		try {
			await persist(nextEvents, [eventId]);
		} catch (err) {
			setSaveError(
				err instanceof Error ? err.message : 'Could not delete attendance.'
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<main className="mx-auto flex w-full max-w-xl min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Add your attendance dates
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				Add the dates of your stay so others can see when you will be on site.
				You can skip this and add stays later from the calendar.
			</p>
			<p className="mt-2 text-sm text-[#666]">This step is optional.</p>

			{error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}

			{saveError ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{saveError}
				</p>
			) : null}

			<div className="mt-8">
				<AttendanceEditor
					ref={editorRef}
					userEvents={events}
					defaultTitle={defaultTitle}
					defaultMode={events.length === 0 ? 'add' : null}
					onSave={payload => {
						void handleSave(payload);
					}}
					onDelete={eventId => {
						void handleDelete(eventId);
					}}
					onFormModeChange={setFormMode}
				/>
			</div>

			{saving ? (
				<p
					className="mt-4 text-sm text-[#666]"
					aria-live="polite"
				>
					Saving…
				</p>
			) : null}

			{showAfterSavePrompt ? (
				<div className="mt-8 space-y-3">
					<p className="text-sm text-[#444]">
						Attendance saved. Want to add another?
					</p>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={() => editorRef.current?.startAdd()}
					>
						Add another stay
					</Button>
					<form action={continueInviteAttendance}>
						<SubmitButton
							className="w-full"
							disabled={saving}
						>
							Continue
						</SubmitButton>
					</form>
				</div>
			) : null}

			{events.length === 0 ? (
				<form
					action={skipInviteAttendance}
					className="mt-8"
				>
					<SubmitButton
						variant="outline"
						className="w-full"
						disabled={saving}
					>
						Skip for now
					</SubmitButton>
				</form>
			) : null}

			<InviteOnboardingProgress step="attendance" />
		</main>
	);
}
