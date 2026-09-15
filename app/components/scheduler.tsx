'use client';

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore
} from 'react';
import { DayPilot, DayPilotScheduler } from '@daypilot/daypilot-lite-react';
import {
	AvailabilityModal,
	ReadOnlyAvailabilityModal
} from '@/app/components/availability-modal';
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Search,
	Settings
} from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import '../styles/brown_theme.css';
import '../styles/selection-separator.css';
import '../styles/color-schemes.css';
import '../styles/scheduler-header-layouts.css';
import { SCHEDULER_SCHEME, schemeToCssVars } from '@/app/lib/color-schemes';
import { saveAttendanceBatch } from '@/lib/attendance/actions';
import {
	AnalyticsEvents,
	useAnalytics
} from '@/components/analytics/posthog-provider';
import {
	updateEventBarColor,
	updateSchedulerPreferences
} from '@/lib/attendance/preference-actions';
import { EVENT_BAR_PALETTE } from '@/lib/attendance/event-bar-palette';
import {
	attendanceToEvent,
	dayPilotEndToModalInclusive,
	eventToAttendanceStay,
	modalInclusiveEndToDayPilotEnd
} from '@/lib/attendance/adapters';
import {
	fuzzyMatch,
	normalizeSearchText
} from '@/lib/attendance/member-search';
import type {
	AttendanceRow,
	ProfileResource,
	SchedulerFontSize,
	SchedulerPreferences
} from '@/lib/attendance/types';

function filterPinnedMemberIds(
	ids: string[],
	loggedInId: string,
	resourceRows: DayPilot.ResourceData[]
) {
	const validIds = new Set(resourceRows.map(resource => String(resource.id)));
	return ids.filter(id => id !== loggedInId && validIds.has(id));
}

const defaultStart = DayPilot.Date.today().firstDayOfWeek(1); // Monday
const defaultEnd = defaultStart.addYears(2);
const defaultDays = new DayPilot.Duration(
	defaultStart,
	defaultEnd.addDays(1)
).totalDays();

function useIsNarrowScreen(breakpointPx = 640) {
	return useSyncExternalStore(
		onStoreChange => {
			const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
			mq.addEventListener('change', onStoreChange);
			return () => mq.removeEventListener('change', onStoreChange);
		},
		() => window.matchMedia(`(max-width: ${breakpointPx}px)`).matches,
		() => false
	);
}

function toInputDate(date: DayPilot.Date) {
	return date.toString('yyyy-MM-dd');
}

function rangeFromInputs(startValue: string, endValue: string) {
	if (!startValue || !endValue) {
		return { error: 'Choose both a start and end date.' };
	}

	const startDate = new DayPilot.Date(startValue);
	const endDate = new DayPilot.Date(endValue);

	if (endDate.getTotalTicks() < startDate.getTotalTicks()) {
		return { error: 'End date must be on or after the start date.' };
	}

	const days = new DayPilot.Duration(startDate, endDate.addDays(1)).totalDays();

	return { startDate, days };
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function stripDraftTags(event: DayPilot.EventData): DayPilot.EventData {
	const restTags = { ...(event.tags ?? {}) };
	delete restTags.markedForDeletion;
	return {
		...event,
		tags: {
			...restTags,
			saveStatus: 'ready'
		}
	};
}

type SaveUiState = 'idle' | 'loading' | 'success' | 'error';
type EditStatus = 'ready' | 'unsaved' | 'saved';

const EVENT_STATUS_LABELS: Record<EditStatus, string> = {
	ready: 'Drag to edit',
	unsaved: 'Unsaved',
	saved: 'Saved'
};

function getEventSaveStatus(event: DayPilot.EventData): EditStatus {
	const status = event.tags?.saveStatus;
	if (status === 'ready' || status === 'unsaved' || status === 'saved') {
		return status;
	}
	return 'ready';
}

function isMarkedForDeletion(event: DayPilot.EventData): boolean {
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

function withEventContent(
	event: DayPilot.EventData,
	content: { title: string; note: string }
): DayPilot.EventData {
	return {
		...event,
		text: content.title,
		tags: {
			...event.tags,
			title: content.title,
			note: content.note
		}
	};
}

function withEventSaveStatus(
	event: DayPilot.EventData,
	saveStatus: EditStatus
): DayPilot.EventData {
	return {
		...event,
		tags: {
			...event.tags,
			saveStatus
		}
	};
}

function withMarkedForDeletion(
	event: DayPilot.EventData,
	markedForDeletion: boolean
): DayPilot.EventData {
	return {
		...event,
		tags: {
			...event.tags,
			markedForDeletion,
			saveStatus: markedForDeletion
				? 'unsaved'
				: event.tags?.saveStatus ?? 'unsaved'
		}
	};
}

const SCHEDULER_FONT_SIZE: Record<SchedulerFontSize, { cellWidth: number }> = {
	small: { cellWidth: 28 },
	medium: { cellWidth: 32 },
	large: { cellWidth: 38 }
};

type SchedulerProps = {
	profiles: ProfileResource[];
	attendance: AttendanceRow[];
	preferences: SchedulerPreferences;
	currentUserId: string;
	isAdmin: boolean;
};

const Scheduler = ({
	profiles,
	attendance,
	preferences,
	currentUserId,
	isAdmin
}: SchedulerProps) => {
	const { track } = useAnalytics();
	const resources = useMemo<DayPilot.ResourceData[]>(
		() =>
			profiles.map(profile => ({
				id: profile.id,
				name: profile.full_name || 'Member'
			})),
		[profiles]
	);

	const eventBarColorByUserId = useMemo(() => {
		const map = new Map<string, string>();
		for (const profile of profiles) {
			if (profile.event_bar_color) {
				map.set(profile.id, profile.event_bar_color);
			}
		}
		return map;
	}, [profiles]);

	/** Persisted attendance snapshot from Supabase (loaded props + after Save). */
	const [dbEvents, setDbEvents] = useState<DayPilot.EventData[]>(() =>
		attendance.map(attendanceToEvent)
	);

	useEffect(() => {
		setDbEvents(attendance.map(attendanceToEvent));
		setDraftEvents(null);
	}, [attendance]);

	/**
	 * Working calendar with unsaved edits. `null` means "show the DB as-is"
	 * (SSR-safe and resets cleanly on discard).
	 */
	const [draftEvents, setDraftEvents] = useState<DayPilot.EventData[] | null>(
		null
	);
	const eventRows = draftEvents ?? dbEvents;
	const setEventRows = (
		update:
			| DayPilot.EventData[]
			| ((prev: DayPilot.EventData[]) => DayPilot.EventData[])
	) => {
		setDraftEvents(prev => {
			const current = prev ?? dbEvents;
			return typeof update === 'function' ? update(current) : update;
		});
	};
	const [startValue, setStartValue] = useState(toInputDate(defaultStart));
	const [endValue, setEndValue] = useState(toInputDate(defaultEnd));
	const [query, setQuery] = useState('');
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
	const [selectedIdsDraft, setSelectedIdsDraft] = useState<string[] | null>(
		null
	);
	const [schedulerMountKey, setSchedulerMountKey] = useState(0);
	const [ownEventBarColorOverride, setOwnEventBarColorOverride] = useState<
		string | null
	>(null);
	const [saveUiState, setSaveUiState] = useState<SaveUiState>('idle');
	const [savedThisSession, setSavedThisSession] = useState(false);
	const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
	const [availabilityOpen, setAvailabilityOpen] = useState(false);
	const [availabilityFocusId, setAvailabilityFocusId] = useState<string | null>(
		null
	);
	const [availabilityTargetUserId, setAvailabilityTargetUserId] =
		useState(currentUserId);
	const [readOnlyEvent, setReadOnlyEvent] = useState<DayPilot.EventData | null>(
		null
	);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const unsavedHistoryPushedRef = useRef(false);
	const allowLeaveRef = useRef(false);
	const isNarrow = useIsNarrowScreen();
	const [namesCollapsed, setNamesCollapsed] = useState(true);
	const [fontSizeOverride, setFontSizeOverride] =
		useState<SchedulerFontSize | null>(null);
	// Test override for DayPilot floating event labels (sticky names while scrolling).
	// Library default is off on iOS; null keeps that default.
	const [floatingEventsOverride, setFloatingEventsOverride] = useState<
		boolean | null
	>(null);
	const libraryFloatingEvents = useSyncExternalStore(
		() => () => {},
		() => {
			const ua = navigator.userAgent;
			const isIos = ua.includes('iPhone') || ua.includes('iPad');
			return !isIos;
		},
		() => true
	);
	const floatingEvents = floatingEventsOverride ?? libraryFloatingEvents;
	const fontSize = fontSizeOverride ?? preferences.fontSize;
	const activeScheme = SCHEDULER_SCHEME;

	const profileEventBarColor =
		profiles.find(profile => profile.id === currentUserId)?.event_bar_color ??
		null;
	const ownEventBarColor = ownEventBarColorOverride ?? profileEventBarColor;

	const storedPinnedIds = useMemo(
		() =>
			filterPinnedMemberIds(
				preferences.pinnedMemberIds,
				currentUserId,
				resources
			),
		[preferences.pinnedMemberIds, currentUserId, resources]
	);
	const selectedIds = selectedIdsDraft ?? storedPinnedIds;

	const resolveEventBarColor = (userId: string) => {
		if (userId === currentUserId && ownEventBarColor) {
			return ownEventBarColor;
		}
		return eventBarColorByUserId.get(userId) ?? activeScheme.eventBar;
	};

	const currentUserBarColor = resolveEventBarColor(currentUserId);

	const updateSelectedIds = (
		update: string[] | ((prev: string[]) => string[])
	) => {
		const base = selectedIdsDraft ?? storedPinnedIds;
		const next = typeof update === 'function' ? update(base) : update;
		setSelectedIdsDraft(next);
		void updateSchedulerPreferences({ pinnedMemberIds: next }).catch(error => {
			console.error(error);
		});
	};

	const persistFontSize = (next: SchedulerFontSize) => {
		setFontSizeOverride(next);
		void updateSchedulerPreferences({ fontSize: next }).catch(error => {
			console.error(error);
		});
	};

	const persistEventBarColor = (color: string) => {
		setOwnEventBarColorOverride(color);
		setSchedulerMountKey(key => key + 1);
		void updateEventBarColor(color).catch(error => {
			console.error(error);
		});
	};
	const canEditResource = (resourceId: string) =>
		isAdmin || resourceId === currentUserId;

	const hasUnsavedChanges = useMemo(
		() =>
			eventRows.some(event => {
				const resourceId = String(event.resource ?? '');
				if (!(isAdmin || resourceId === currentUserId)) {
					return false;
				}
				return (
					getEventSaveStatus(event) === 'unsaved' || isMarkedForDeletion(event)
				);
			}),
		[eventRows, isAdmin, currentUserId]
	);

	const saveChanges = async (eventsOverride?: DayPilot.EventData[]) => {
		if (saveUiState === 'loading') {
			return;
		}

		const rows = eventsOverride ?? eventRows;
		const hasUnsavedInRows = rows.some(event => {
			const resourceId = String(event.resource ?? '');
			if (!(isAdmin || resourceId === currentUserId)) {
				return false;
			}
			return (
				getEventSaveStatus(event) === 'unsaved' || isMarkedForDeletion(event)
			);
		});
		if (!hasUnsavedInRows) {
			return;
		}

		if (eventsOverride) {
			setDraftEvents(eventsOverride);
			setSavedThisSession(false);
		}

		const ownedEvents = isAdmin
			? rows
			: rows.filter(event => String(event.resource) === currentUserId);
		const eventsToSave = ownedEvents.filter(
			event => !isMarkedForDeletion(event)
		);
		const unsavedIds = new Set(
			eventsToSave
				.filter(event => getEventSaveStatus(event) === 'unsaved')
				.map(event => String(event.id))
		);

		const softDeletedIds = ownedEvents
			.filter(event => isMarkedForDeletion(event))
			.map(event => String(event.id));

		const baselineOwnedIds = new Set(
			(isAdmin
				? dbEvents
				: dbEvents.filter(e => String(e.resource) === currentUserId)
			).map(event => String(event.id))
		);
		const keptIds = new Set(eventsToSave.map(event => String(event.id)));
		const droppedFromScope = [...baselineOwnedIds].filter(
			id => !keptIds.has(id)
		);
		const deleteIds = [...new Set([...softDeletedIds, ...droppedFromScope])];

		setSaveUiState('loading');
		try {
			const rowsFromDb = await saveAttendanceBatch({
				stays: eventsToSave.map(eventToAttendanceStay),
				deleteIds
			});
			const nextDb = rowsFromDb.map(attendanceToEvent);
			setDbEvents(nextDb);
			setDraftEvents(
				nextDb.map(event =>
					unsavedIds.has(String(event.id))
						? withEventSaveStatus(event, 'saved')
						: event
				)
			);
			setSavedThisSession(true);
			unsavedHistoryPushedRef.current = false;
			setSaveUiState('success');
			const createdCount = unsavedIds.size;
			const editedCount = Math.max(0, eventsToSave.length - createdCount);
			if (createdCount > 0) {
				track(AnalyticsEvents.STAY_CREATED, { count: createdCount });
			}
			if (editedCount > 0 || deleteIds.length > 0) {
				track(AnalyticsEvents.STAY_EDITED, {
					count: editedCount,
					deleted_count: deleteIds.length
				});
			}
		} catch {
			setSaveUiState('error');
		}
	};

	const availabilityTargetId = availabilityTargetUserId || currentUserId;
	const availabilityTargetName =
		resources.find(resource => String(resource.id) === availabilityTargetId)
			?.name ?? '';

	const userAvailabilityEvents = useMemo(
		() =>
			eventRows.filter(event => String(event.resource) === availabilityTargetId),
		[eventRows, availabilityTargetId]
	);

	const availabilityMembers = useMemo(
		() =>
			resources
				.filter(resource => resource.id != null)
				.map(resource => ({
					id: String(resource.id),
					name: resource.name ?? 'Member'
				})),
		[resources]
	);

	const closeAvailabilityModal = () => {
		setAvailabilityOpen(false);
		setAvailabilityFocusId(null);
		setAvailabilityTargetUserId(currentUserId);
	};

	const closeReadOnlyAvailabilityModal = () => {
		setReadOnlyEvent(null);
	};

	const saveAvailabilityFromModal = async (payload: {
		eventId: string | null;
		startValue: string;
		endValue: string;
		title: string;
		note: string;
	}) => {
		const targetId = availabilityTargetId;
		if (!isAdmin && targetId !== currentUserId) {
			return;
		}
		const resourceName =
			resources.find(resource => String(resource.id) === targetId)?.name ?? '';
		const title = payload.title.trim() || resourceName;
		const note = payload.note.trim();
		const start = `${payload.startValue}T00:00:00`;
		const end = modalInclusiveEndToDayPilotEnd(payload.endValue);
		const current = draftEvents ?? dbEvents;

		const nextEvents =
			payload.eventId == null
				? [
						...current,
						withEventSaveStatus(
							withEventContent(
								{
									id: crypto.randomUUID(),
									resource: targetId,
									start,
									end,
									text: title
								},
								{ title, note }
							),
							'unsaved'
						)
				  ]
				: current.map(event =>
						String(event.id) === payload.eventId
							? withEventSaveStatus(
									withEventContent({ ...event, start, end }, { title, note }),
									'unsaved'
							  )
							: event
				  );

		setAvailabilityOpen(false);
		setAvailabilityFocusId(null);
		setAvailabilityTargetUserId(currentUserId);
		await saveChanges(nextEvents);
	};

	const dismissSaveOverlay = () => {
		setSaveUiState('idle');
	};

	const stayOnPage = () => {
		setLeaveDialogOpen(false);
	};

	const leaveWithoutSaving = () => {
		allowLeaveRef.current = true;
		setLeaveDialogOpen(false);
		setDraftEvents(null);
		setSavedThisSession(false);
		unsavedHistoryPushedRef.current = false;
		history.back();
	};

	const discardChanges = () => {
		setDraftEvents(null);
		setSavedThisSession(false);
		unsavedHistoryPushedRef.current = false;
	};

	useEffect(() => {
		if (!hasUnsavedChanges) {
			return;
		}
		if (!unsavedHistoryPushedRef.current) {
			history.pushState({ schedulerUnsavedGuard: true }, '');
			unsavedHistoryPushedRef.current = true;
		}

		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = '';
		};

		const onPopState = () => {
			if (allowLeaveRef.current) {
				allowLeaveRef.current = false;
				return;
			}
			history.pushState({ schedulerUnsavedGuard: true }, '');
			setLeaveDialogOpen(true);
		};

		window.addEventListener('beforeunload', onBeforeUnload);
		window.addEventListener('popstate', onPopState);
		return () => {
			window.removeEventListener('beforeunload', onBeforeUnload);
			window.removeEventListener('popstate', onPopState);
		};
	}, [hasUnsavedChanges]);

	const range = useMemo(
		() => rangeFromInputs(startValue, endValue),
		[startValue, endValue]
	);
	const startDate = 'startDate' in range ? range.startDate : defaultStart;
	const days = 'days' in range ? range.days : defaultDays;
	const error = 'error' in range ? range.error : null;

	const suggestions = normalizeSearchText(query)
		? resources
				.filter(
					resource =>
						resource.id != null &&
						!selectedIds.includes(String(resource.id)) &&
						fuzzyMatch(query, resource.name ?? '')
				)
				.slice(0, 8)
		: [];
	const highlightedSuggestionIndex =
		suggestions.length === 0
			? 0
			: Math.min(activeSuggestionIndex, suggestions.length - 1);
	const highlightedSuggestion = suggestions[highlightedSuggestionIndex];

	const orderedResources = useMemo(() => {
		const loggedIn = resources.find(
			resource => String(resource.id) === currentUserId
		);
		const selected = selectedIds
			.filter(id => id !== currentUserId)
			.map(id => resources.find(resource => String(resource.id) === id))
			.filter(
				(resource): resource is DayPilot.ResourceData => resource != null
			);
		const rest = resources.filter(
			resource =>
				resource.id != null &&
				String(resource.id) !== currentUserId &&
				!selectedIds.includes(String(resource.id))
		);
		return [...(loggedIn ? [loggedIn] : []), ...selected, ...rest];
	}, [resources, selectedIds, currentUserId]);

	const addSelected = (id: string) => {
		updateSelectedIds(current =>
			current.includes(id) ? current : [...current, id]
		);
		setQuery('');
		setActiveSuggestionIndex(0);
	};

	const toggleSelected = (id: string) => {
		updateSelectedIds(current =>
			current.includes(id)
				? current.filter(selectedId => selectedId !== id)
				: [...current, id]
		);
		setQuery('');
		setActiveSuggestionIndex(0);
	};

	const onBeforeRowHeaderRender = (
		args: DayPilot.SchedulerBeforeRowHeaderRenderArgs
	) => {
		const id = String(args.row.id);
		const isLoggedIn = id === currentUserId;
		const isSelected = selectedIds.includes(id);

		if (isLoggedIn) {
			args.row.cssClass = isSelected
				? 'resource-name-cell resource-name-cell-logged-in resource-name-cell-has-deselect'
				: 'resource-name-cell resource-name-cell-logged-in';
			args.row.backColor = activeScheme.rowLoggedIn;
		} else if (isSelected) {
			args.row.cssClass = 'resource-name-cell resource-name-cell-selected';
			args.row.backColor = activeScheme.rowSelected;
		} else {
			args.row.cssClass = 'resource-name-cell';
		}

		args.row.areas = isSelected
			? [
					{
						right: 4,
						top: 0,
						bottom: 0,
						width: 18,
						html: '×',
						cssClass: 'resource-deselect-mark',
						fontColor: isLoggedIn ? '#3b2f0a' : '#ffffff',
						verticalAlignment: 'center',
						horizontalAlignment: 'center',
						toolTip: 'Deselect',
						action: 'None'
					}
			  ]
			: [];
	};

	const onBeforeCellRender = (args: DayPilot.SchedulerBeforeCellRenderArgs) => {
		const resourceId = String(args.cell.resource);
		if (resourceId === currentUserId) {
			args.cell.properties.backColor = args.cell.properties.business
				? activeScheme.cellLoggedInBiz
				: activeScheme.cellLoggedInWeekend;
			return;
		}
		if (!selectedIds.includes(resourceId)) {
			return;
		}
		args.cell.properties.backColor = args.cell.properties.business
			? activeScheme.cellSelectedBiz
			: activeScheme.cellSelectedWeekend;
	};

	const onRowClick = (args: DayPilot.SchedulerRowClickArgs) => {
		toggleSelected(String(args.row.id));
	};

	const persistEventChange = (
		id: DayPilot.EventId,
		patch: Pick<DayPilot.EventData, 'start' | 'end' | 'resource'>
	) => {
		setEventRows(current =>
			current.map(event =>
				String(event.id) === String(id)
					? withEventSaveStatus({ ...event, ...patch }, 'unsaved')
					: event
			)
		);
		setSavedThisSession(false);
	};

	const onEventMove = (args: DayPilot.SchedulerEventMoveArgs) => {
		const fromResource = String(args.e.resource());
		const toResource = String(args.newResource);
		if (!canEditResource(fromResource) || !canEditResource(toResource)) {
			args.preventDefault();
		}
	};

	const onEventMoved = (args: DayPilot.SchedulerEventMovedArgs) => {
		const fromResource = String(args.e.resource());
		const toResource = String(args.newResource);
		if (!canEditResource(fromResource) || !canEditResource(toResource)) {
			return;
		}
		setEventRows(current =>
			current.map(event =>
				String(event.id) === String(args.e.id())
					? withEventSaveStatus(
							{
								...event,
								start: args.newStart.toString(),
								end: args.newEnd.toString(),
								resource: args.newResource
							},
							'unsaved'
					  )
					: event
			)
		);
		setSavedThisSession(false);
	};

	const onEventResize = (args: DayPilot.SchedulerEventResizeArgs) => {
		if (!canEditResource(String(args.e.resource()))) {
			args.preventDefault();
		}
	};

	const onEventResized = (args: DayPilot.SchedulerEventResizedArgs) => {
		if (!canEditResource(String(args.e.resource()))) {
			return;
		}
		persistEventChange(args.e.id(), {
			start: args.newStart.toString(),
			end: args.newEnd.toString()
		});
	};

	const deleteEvent = (id: DayPilot.EventId) => {
		setEventRows(current =>
			current.map(event => {
				if (String(event.id) !== String(id)) {
					return event;
				}
				return withMarkedForDeletion(event, !isMarkedForDeletion(event));
			})
		);
		setSavedThisSession(false);
	};

	const onBeforeEventRender = (
		args: DayPilot.SchedulerBeforeEventRenderArgs
	) => {
		const editable = canEditResource(String(args.data.resource ?? ''));
		const saveStatus = getEventSaveStatus(args.data);
		const markedForDeletion = isMarkedForDeletion(args.data);
		const eventData = args.data as DayPilot.EventData & {
			moveDisabled?: boolean;
			resizeDisabled?: boolean;
		};
		eventData.moveDisabled = !editable || markedForDeletion;
		eventData.resizeDisabled = !editable || markedForDeletion;

		const classNames = [
			editable ? 'scheduler-event-editable' : 'scheduler-event-readonly',
			editable && saveStatus === 'unsaved' && !markedForDeletion
				? 'scheduler-event-unsaved'
				: '',
			editable && markedForDeletion ? 'scheduler-event-marked-delete' : ''
		]
			.filter(Boolean)
			.join(' ');
		args.data.cssClass = classNames;

		const barColor = resolveEventBarColor(String(args.data.resource ?? ''));
		args.data.barColor = barColor;
		args.data.barBackColor = `${barColor}33`;

		if (editable && saveStatus === 'unsaved' && !markedForDeletion) {
			args.data.backColor = '#fff3b0';
			args.data.borderColor = '#e6a800';
			args.data.fontColor = '#5c3d00';
		}

		const name = escapeHtml(getEventTitle(args.data));
		const chipLabel = markedForDeletion
			? 'To delete'
			: EVENT_STATUS_LABELS[saveStatus];
		const chipClass = markedForDeletion
			? 'edit-status-chip-delete'
			: `edit-status-chip-${saveStatus}`;
		const statusChip = editable
			? `<span class="edit-status-chip ${chipClass} edit-status-chip-on-event">${chipLabel}</span>`
			: '';
		const deleteTitle = markedForDeletion ? 'Undo delete' : 'Mark for deletion';
		args.data.html = editable
			? `<span class="scheduler-event-content"><span class="scheduler-event-name">${name}</span>${statusChip}<span class="scheduler-event-delete-mark" title="${deleteTitle}" onmousedown="event.stopPropagation()">×</span></span>`
			: `<span class="scheduler-event-content"><span class="scheduler-event-name">${name}</span></span>`;
	};

	const onEventClick = (args: DayPilot.SchedulerEventClickArgs) => {
		const target = args.originalEvent.target;
		if (
			target instanceof Element &&
			target.closest('.scheduler-event-delete-mark')
		) {
			args.preventDefault();
			if (!canEditResource(String(args.e.resource()))) {
				return;
			}
			deleteEvent(args.e.id());
			return;
		}

		const eventId = String(args.e.id());
		const event = eventRows.find(item => String(item.id) === eventId);
		if (!event) {
			return;
		}

		const resourceId = String(event.resource);
		if (resourceId === currentUserId || isAdmin) {
			setReadOnlyEvent(null);
			setAvailabilityTargetUserId(resourceId);
			setAvailabilityFocusId(eventId);
			setAvailabilityOpen(true);
			return;
		}

		setAvailabilityOpen(false);
		setAvailabilityFocusId(null);
		setAvailabilityTargetUserId(currentUserId);
		setReadOnlyEvent(event);
	};

	const onTimeRangeSelect = (args: DayPilot.SchedulerTimeRangeSelectArgs) => {
		if (!canEditResource(String(args.resource))) {
			args.preventDefault();
		}
	};

	const onTimeRangeSelected = (
		args: DayPilot.SchedulerTimeRangeSelectedArgs
	) => {
		if (!canEditResource(String(args.resource))) {
			args.control.clearSelection();
			return;
		}
		const resourceName =
			resources.find(resource => String(resource.id) === String(args.resource))
				?.name ?? '';
		setEventRows(current => {
			return [
				...current,
				withEventSaveStatus(
					withEventContent(
						{
							id: crypto.randomUUID(),
							resource: args.resource,
							start: args.start.toString(),
							end: args.end.toString(),
							text: resourceName
						},
						{ title: resourceName, note: '' }
					),
					'unsaved'
				)
			];
		});
		setSavedThisSession(false);
		args.control.clearSelection();
	};

	const rowHeaderWidth = !isNarrow ? 180 : namesCollapsed ? 2 : 100;
	const fontSizeConfig = SCHEDULER_FONT_SIZE[fontSize];

	const config: DayPilot.SchedulerConfig = useMemo(
		() => ({
			timeHeaders: [{ groupBy: 'Month' }, { groupBy: 'Day', format: 'd' }],
			scale: 'Day',
			startDate,
			days,
			cellWidth: fontSizeConfig.cellWidth,
			rowHeaderWidth,
			floatingEvents,
			rowClickHandling: 'Enabled',
			eventMoveHandling: 'Update',
			eventResizeHandling: 'Update',
			eventClickHandling: 'Enabled',
			eventDeleteHandling: 'Disabled',
			timeRangeSelectedHandling: 'Enabled'
		}),
		[startDate, days, rowHeaderWidth, fontSizeConfig.cellWidth, floatingEvents]
	);

	return (
		<div
			data-scheduler-scheme="sandstone-flat"
			style={schemeToCssVars(activeScheme)}
		>
			{hasUnsavedChanges ? (
				<div
					role="status"
					aria-live="polite"
					className="fixed right-4 bottom-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[#d4a017]/60 bg-popover p-4 shadow-lg ring-1 ring-foreground/10"
				>
					<p className="mb-1 text-sm font-medium text-foreground">
						Keep your updates?
					</p>
					<p className="mb-3 text-sm text-muted-foreground">
						You’ve changed your calendar. Save to keep them, or discard to go
						back to what you had before.
					</p>
					<div className="flex flex-wrap justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={discardChanges}
							disabled={saveUiState === 'loading'}
						>
							Discard
						</Button>
						<Button
							type="button"
							size="lg"
							onClick={() => {
								void saveChanges();
							}}
							disabled={saveUiState === 'loading'}
							className="border border-[#d4a017] bg-[#ffe566] text-[#5c3d00] hover:bg-[#ffd633] hover:text-[#5c3d00]"
						>
							Save
						</Button>
					</div>
				</div>
			) : null}

			<Dialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
			>
				<DialogContent
					className="sm:max-w-md"
					showCloseButton
				>
					<DialogHeader>
						<DialogTitle>Settings</DialogTitle>
						<DialogDescription>
							Adjust text size, date range, and your attendance bar colour.
							Preferences are saved to your account.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4">
						<div className="grid gap-1.5">
							<Label id="scheduler-event-bar-color-label">
								Your attendance bar colour
							</Label>
							<p className="text-xs text-muted-foreground">
								Colours the top strip on your calendar events. Others see this
								colour on your stays.
							</p>
							<div
								role="radiogroup"
								aria-labelledby="scheduler-event-bar-color-label"
								className="flex flex-wrap gap-2 pt-1"
							>
								{EVENT_BAR_PALETTE.map(color => {
									const selected = currentUserBarColor === color;
									return (
										<button
											key={color}
											type="button"
											role="radio"
											aria-checked={selected}
											aria-label={`Bar colour ${color}`}
											title={color}
											onClick={() => persistEventBarColor(color)}
											className={cn(
												'size-8 rounded-full border-2 transition-[box-shadow,transform]',
												selected
													? 'scale-105 border-[#333] shadow-sm'
													: 'border-transparent hover:scale-105'
											)}
											style={{ background: color }}
										/>
									);
								})}
							</div>
						</div>

						<div className="grid gap-1.5">
							<Label id="scheduler-font-size-label">Text size</Label>
							<ToggleGroup
								aria-labelledby="scheduler-font-size-label"
								variant="outline"
								spacing={0}
								value={[fontSize]}
								onValueChange={values => {
									const next = values[0];
									if (
										next === 'small' ||
										next === 'medium' ||
										next === 'large'
									) {
										persistFontSize(next);
									}
								}}
							>
								<ToggleGroupItem
									value="small"
									aria-label="Small text"
									title="Small"
									className="px-2.5"
								>
									<span
										aria-hidden
										className="font-serif text-[11px] font-semibold leading-none"
									>
										A
									</span>
								</ToggleGroupItem>
								<ToggleGroupItem
									value="medium"
									aria-label="Medium text"
									title="Medium"
									className="px-2.5"
								>
									<span
										aria-hidden
										className="font-serif text-[15px] font-semibold leading-none"
									>
										A
									</span>
								</ToggleGroupItem>
								<ToggleGroupItem
									value="large"
									aria-label="Large text"
									title="Large"
									className="px-2.5"
								>
									<span
										aria-hidden
										className="font-serif text-[19px] font-semibold leading-none"
									>
										A
									</span>
								</ToggleGroupItem>
							</ToggleGroup>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<Label htmlFor="scheduler-start-date">Start date</Label>
								<Input
									id="scheduler-start-date"
									type="date"
									value={startValue}
									max={endValue || undefined}
									onChange={event => setStartValue(event.target.value)}
									required
									className="bg-muted"
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor="scheduler-end-date">End date</Label>
								<Input
									id="scheduler-end-date"
									type="date"
									value={endValue}
									min={startValue || undefined}
									onChange={event => setEndValue(event.target.value)}
									required
									className="bg-muted"
								/>
							</div>
						</div>

						<div className="grid gap-1.5 rounded-lg border border-dashed border-[#d4a017]/70 bg-[#fff8e8] p-3">
							<Label id="scheduler-floating-events-label">
								Sticky event labels (test)
							</Label>
							<p className="text-xs text-muted-foreground">
								DayPilot default on this device:{' '}
								{libraryFloatingEvents ? 'on' : 'off'}
								{!libraryFloatingEvents
									? ' (disabled on iOS for scroll performance)'
									: ''}
								. Not saved — session only.
							</p>
							<ToggleGroup
								aria-labelledby="scheduler-floating-events-label"
								variant="outline"
								spacing={0}
								value={[floatingEvents ? 'on' : 'off']}
								onValueChange={values => {
									const next = values[0];
									if (next === 'on' || next === 'off') {
										setFloatingEventsOverride(next === 'on');
										setSchedulerMountKey(key => key + 1);
									}
								}}
							>
								<ToggleGroupItem
									value="off"
									aria-label="Sticky labels off"
									className="px-3"
								>
									Off
								</ToggleGroupItem>
								<ToggleGroupItem
									value="on"
									aria-label="Sticky labels on"
									className="px-3"
								>
									On
								</ToggleGroupItem>
							</ToggleGroup>
						</div>

						{error ? (
							<p
								className="text-sm text-destructive"
								role="alert"
							>
								{error}
							</p>
						) : null}
					</div>

					<DialogFooter>
						<Button
							type="button"
							onClick={() => setSettingsOpen(false)}
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{availabilityOpen ? (
				<AvailabilityModal
					open
					userEvents={userAvailabilityEvents}
					defaultTitle={availabilityTargetName}
					initialEventId={availabilityFocusId}
					isAdmin={isAdmin}
					members={availabilityMembers}
					currentUserId={currentUserId}
					targetUserId={availabilityTargetId}
					targetMemberName={availabilityTargetName}
					onSelectMember={memberId => {
						setAvailabilityFocusId(null);
						setAvailabilityTargetUserId(memberId);
					}}
					onClearMember={() => {
						setAvailabilityFocusId(null);
						setAvailabilityTargetUserId(currentUserId);
					}}
					onDiscard={closeAvailabilityModal}
					onSave={payload => {
						void saveAvailabilityFromModal(payload);
					}}
				/>
			) : null}

			{readOnlyEvent != null ? (
				<ReadOnlyAvailabilityModal
					open
					event={readOnlyEvent}
					memberName={
						resources.find(
							resource => String(resource.id) === String(readOnlyEvent.resource)
						)?.name ?? 'Member'
					}
					onClose={closeReadOnlyAvailabilityModal}
				/>
			) : null}

			{saveUiState !== 'idle' ? (
				<div
					role="dialog"
					aria-modal="true"
					aria-live="polite"
					style={{
						position: 'fixed',
						inset: 0,
						zIndex: 1000,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: 'rgba(40, 32, 24, 0.45)'
					}}
				>
					<div
						style={{
							minWidth: '16rem',
							maxWidth: '22rem',
							padding: '1.5rem 1.75rem',
							borderRadius: '8px',
							background: '#fff',
							boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
							textAlign: 'center'
						}}
					>
						{saveUiState === 'loading' ? (
							<>
								<div
									className="save-overlay-spinner"
									aria-hidden="true"
								/>
								<p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>
									Saving changes…
								</p>
								<p style={{ margin: 0, color: '#5c5348' }}>
									Saving availability…
								</p>
							</>
						) : null}
						{saveUiState === 'success' ? (
							<>
								<p
									style={{
										margin: '0 0 0.75rem',
										fontWeight: 600,
										color: '#2f6b45'
									}}
								>
									Changes saved
								</p>
								<p style={{ margin: '0 0 1.25rem', color: '#5c5348' }}>
									Availability has been updated.
								</p>
								<button
									type="button"
									onClick={dismissSaveOverlay}
									style={{
										padding: '0.4rem 1rem',
										border: '1px solid #6b512b',
										borderRadius: '4px',
										background: '#6b512b',
										color: '#fff',
										cursor: 'pointer'
									}}
								>
									OK
								</button>
							</>
						) : null}
						{saveUiState === 'error' ? (
							<>
								<p
									style={{
										margin: '0 0 0.75rem',
										fontWeight: 600,
										color: '#8a1f1f'
									}}
								>
									Save failed
								</p>
								<p style={{ margin: '0 0 1.25rem', color: '#5c5348' }}>
									The database write did not succeed. Your local edits are still
									here — try again.
								</p>
								<button
									type="button"
									onClick={dismissSaveOverlay}
									style={{
										padding: '0.4rem 1rem',
										border: '1px solid #8a1f1f',
										borderRadius: '4px',
										background: '#8a1f1f',
										color: '#fff',
										cursor: 'pointer'
									}}
								>
									OK
								</button>
							</>
						) : null}
					</div>
				</div>
			) : null}

			{leaveDialogOpen ? (
				<div
					role="dialog"
					aria-modal="true"
					aria-live="polite"
					style={{
						position: 'fixed',
						inset: 0,
						zIndex: 1000,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: 'rgba(40, 32, 24, 0.45)'
					}}
				>
					<div
						style={{
							minWidth: '16rem',
							maxWidth: '22rem',
							padding: '1.5rem 1.75rem',
							borderRadius: '8px',
							background: '#fff',
							boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
							textAlign: 'center'
						}}
					>
						<p
							style={{
								margin: '0 0 0.75rem',
								fontWeight: 600,
								color: '#8a5a12'
							}}
						>
							You have unsaved changes
						</p>
						<p style={{ margin: '0 0 1.25rem', color: '#5c5348' }}>
							Leave this page without saving? Your local edits will still be in
							this browser, but they are not saved to the database yet.
						</p>
						<div
							style={{
								display: 'flex',
								gap: '0.5rem',
								justifyContent: 'center',
								flexWrap: 'wrap'
							}}
						>
							<button
								type="button"
								onClick={stayOnPage}
								style={{
									padding: '0.4rem 1rem',
									border: '1px solid #6b512b',
									borderRadius: '4px',
									background: '#6b512b',
									color: '#fff',
									cursor: 'pointer'
								}}
							>
								Stay
							</button>
							<button
								type="button"
								onClick={leaveWithoutSaving}
								style={{
									padding: '0.4rem 1rem',
									border: '1px solid #8a1f1f',
									borderRadius: '4px',
									background: '#fff',
									color: '#8a1f1f',
									cursor: 'pointer'
								}}
							>
								Leave without saving
							</button>
						</div>
					</div>
				</div>
			) : null}

			<h1 className="scheduler-page-title">Attendance Calendar</h1>

			<section
				aria-label="Availability calendar"
				className="scheduler-shell"
			>
				<div className="scheduler-chrome">
					<div className="scheduler-header-island">
						<div className="scheduler-ctrl-primary">
							<Button
								type="button"
								size="lg"
								onClick={() => {
									setAvailabilityFocusId(null);
									setAvailabilityTargetUserId(currentUserId);
									setAvailabilityOpen(true);
								}}
								disabled={saveUiState === 'loading'}
								className="scheduler-manage-btn scheme-primary-btn"
							>
								<CalendarDays
									data-icon="inline-start"
									aria-hidden
								/>
								Manage availability
							</Button>
						</div>

						<div className="scheduler-ctrl-search">
							<div className="scheduler-ctrl-search-field">
								<Search
									aria-hidden
									className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="scheduler-search-people"
									type="search"
									value={query}
									placeholder="Find people"
									aria-label="Find people to compare availability"
									aria-autocomplete="list"
									aria-controls={
										suggestions.length > 0
											? 'scheduler-search-suggestions'
											: undefined
									}
									aria-activedescendant={
										highlightedSuggestion?.id != null
											? `scheduler-search-option-${String(
													highlightedSuggestion.id
											  )}`
											: undefined
									}
									onChange={event => {
										setQuery(event.target.value);
										setActiveSuggestionIndex(0);
									}}
									onKeyDown={event => {
										if (event.key !== 'Enter') {
											return;
										}
										if (highlightedSuggestion?.id == null) {
											return;
										}
										event.preventDefault();
										addSelected(String(highlightedSuggestion.id));
									}}
									autoComplete="off"
									className="scheduler-search-input h-11 bg-muted pl-8"
								/>
							</div>
							{suggestions.length > 0 ? (
								<ul
									id="scheduler-search-suggestions"
									role="listbox"
									className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
									onMouseLeave={() => setActiveSuggestionIndex(0)}
								>
									{suggestions.map((resource, index) => {
										const id = String(resource.id);
										const isHighlighted = index === highlightedSuggestionIndex;
										return (
											<li
												key={id}
												id={`scheduler-search-option-${id}`}
												role="option"
												aria-selected={isHighlighted}
												onMouseEnter={() => setActiveSuggestionIndex(index)}
											>
												<button
													type="button"
													tabIndex={-1}
													onClick={() => addSelected(id)}
													className={cn(
														'block w-full cursor-pointer px-3 py-2 text-left text-sm',
														'focus-visible:outline-none',
														isHighlighted
															? 'bg-accent text-accent-foreground'
															: null
													)}
												>
													{resource.name}
												</button>
											</li>
										);
									})}
								</ul>
							) : null}
						</div>

						<div className="scheduler-ctrl-settings">
							<Button
								type="button"
								variant="outline"
								size="lg"
								onClick={() => setSettingsOpen(true)}
								className="scheduler-settings-btn"
								aria-label="Settings"
							>
								<Settings
									data-icon="inline-start"
									aria-hidden
								/>
								<span className="scheduler-settings-label">Settings</span>
							</Button>
						</div>

						{error ? (
							<p
								className="scheduler-header-error"
								role="alert"
							>
								{error}
							</p>
						) : null}
					</div>

					<div className="scheduler-shell-well">
						<div
							className="scheduler-frame"
							data-font-size={fontSize}
						>
							{isNarrow ? (
								<button
									type="button"
									className={
										namesCollapsed
											? 'scheduler-names-chip'
											: 'scheduler-names-chip scheduler-names-chip-expanded'
									}
									aria-label={
										namesCollapsed
											? 'Show resource names'
											: 'Hide resource names'
									}
									aria-pressed={!namesCollapsed}
									onClick={() => setNamesCollapsed(collapsed => !collapsed)}
								>
									<span className="scheduler-names-chip-face">
										{namesCollapsed ? (
											<>
												<span>Show names</span>
												<ChevronRight
													aria-hidden
													className="scheduler-names-chip-chevron"
												/>
											</>
										) : (
											<ChevronLeft
												aria-hidden
												className="scheduler-names-chip-chevron"
											/>
										)}
									</span>
								</button>
							) : null}
							<DayPilotScheduler
								key={`${schedulerMountKey}-${currentUserId}`}
								{...config}
								theme="brown_theme"
								resources={orderedResources}
								events={eventRows}
								onBeforeRowHeaderRender={onBeforeRowHeaderRender}
								onBeforeCellRender={onBeforeCellRender}
								onBeforeEventRender={onBeforeEventRender}
								onRowClick={onRowClick}
								onEventClick={onEventClick}
								onEventMove={onEventMove}
								onEventMoved={onEventMoved}
								onEventResize={onEventResize}
								onEventResized={onEventResized}
								onTimeRangeSelect={onTimeRangeSelect}
								onTimeRangeSelected={onTimeRangeSelected}
							/>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Scheduler;
