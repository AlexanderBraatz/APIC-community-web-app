import { DayPilot } from '@daypilot/daypilot-lite-react';
import type { AttendanceRow, AttendanceStayInput } from './types';

function datePart(value: string | DayPilot.Date) {
	return new DayPilot.Date(value).toString('yyyy-MM-dd');
}

/** Inclusive calendar end → exclusive DayPilot end (next day at midnight). */
export function inclusiveEndToExclusive(endDateInclusive: string) {
	return new DayPilot.Date(endDateInclusive).addDays(1).toString('yyyy-MM-dd');
}

/** Exclusive DayPilot end → inclusive calendar end. */
export function exclusiveEndToInclusive(endExclusive: string | DayPilot.Date) {
	return new DayPilot.Date(endExclusive).addDays(-1).toString('yyyy-MM-dd');
}

export function attendanceToEvent(row: AttendanceRow): DayPilot.EventData {
	const title = row.title;
	const note = row.note ?? '';
	const exclusiveEnd = inclusiveEndToExclusive(row.end_date);

	return {
		id: row.id,
		resource: row.user_id,
		start: `${row.start_date}T00:00:00`,
		end: `${exclusiveEnd}T00:00:00`,
		text: title,
		tags: {
			title,
			note,
			saveStatus: 'ready'
		}
	};
}

export function eventToAttendanceStay(
	event: DayPilot.EventData
): AttendanceStayInput {
	const titleTag = event.tags?.title;
	const title =
		typeof titleTag === 'string' && titleTag.trim().length > 0
			? titleTag.trim()
			: String(event.text ?? '').trim() || 'Stay';
	const noteTag = event.tags?.note;
	const note =
		typeof noteTag === 'string' && noteTag.trim().length > 0
			? noteTag.trim()
			: null;

	return {
		id: String(event.id),
		user_id: String(event.resource),
		title,
		note,
		start_date: datePart(event.start),
		end_date: exclusiveEndToInclusive(event.end)
	};
}

export function modalInclusiveEndToDayPilotEnd(endInclusive: string) {
	return `${inclusiveEndToExclusive(endInclusive)}T00:00:00`;
}

export function dayPilotEndToModalInclusive(endExclusive: string | DayPilot.Date) {
	return exclusiveEndToInclusive(endExclusive);
}
