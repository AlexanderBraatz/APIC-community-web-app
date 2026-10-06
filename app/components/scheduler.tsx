'use client';

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type PointerEvent as ReactPointerEvent
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
	Pin,
	PinOff,
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
import { DatePickerField } from '@/components/ui/date-picker-field';
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

const ROW_HEADER_WIDTH_DESKTOP = 180;
const ROW_HEADER_WIDTH_MOBILE_MIN = 0;
const ROW_HEADER_WIDTH_MOBILE_MAX = 180;
const ROW_HEADER_WIDTH_MOBILE_DEFAULT = 8;
/** Below this width, show the “Show names” chip instead of the close control. */
const ROW_HEADER_WIDTH_MOBILE_SHOW_NAMES_BELOW = 40;
/** Keep the resize handle fully on-screen when the name column is closed. */
const ROW_HEADER_RESIZE_HANDLE_INSET = 10;

function clampRowHeaderWidth(width: number) {
	return Math.min(
		ROW_HEADER_WIDTH_MOBILE_MAX,
		Math.max(ROW_HEADER_WIDTH_MOBILE_MIN, Math.round(width))
	);
}

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

type SaveUiState = 'idle' | 'loading' | 'success' | 'error';

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

function notePreviewText(note: string, maxLen = 20) {
	const trimmed = note.trim();
	if (!trimmed) {
		return '';
	}
	return `: „${trimmed.slice(0, maxLen)}...`;
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
	}, [attendance]);

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
	const isNarrow = useIsNarrowScreen();
	const [mobileRowHeaderWidth, setMobileRowHeaderWidth] = useState(
		ROW_HEADER_WIDTH_MOBILE_DEFAULT
	);
	const rowHeaderDragRef = useRef<{
		pointerId: number;
		startX: number;
		startWidth: number;
	} | null>(null);
	const [fontSizeOverride, setFontSizeOverride] =
		useState<SchedulerFontSize | null>(null);
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

	const persistAttendance = async (
		nextEvents: DayPilot.EventData[],
		analytics: { created: number; edited: number; deleted: number }
	) => {
		if (saveUiState === 'loading') {
			return;
		}

		const eventsToSave = isAdmin
			? nextEvents
			: nextEvents.filter(event => String(event.resource) === currentUserId);

		const baselineOwnedIds = new Set(
			(isAdmin
				? dbEvents
				: dbEvents.filter(event => String(event.resource) === currentUserId)
			).map(event => String(event.id))
		);
		const keptIds = new Set(eventsToSave.map(event => String(event.id)));
		const deleteIds = [...baselineOwnedIds].filter(id => !keptIds.has(id));

		setSaveUiState('loading');
		try {
			const rowsFromDb = await saveAttendanceBatch({
				stays: eventsToSave.map(eventToAttendanceStay),
				deleteIds
			});
			setDbEvents(rowsFromDb.map(attendanceToEvent));
			setSaveUiState('success');
			if (analytics.created > 0) {
				track(AnalyticsEvents.STAY_CREATED, { count: analytics.created });
			}
			if (
				analytics.edited > 0 ||
				analytics.deleted > 0 ||
				deleteIds.length > 0
			) {
				track(AnalyticsEvents.STAY_EDITED, {
					count: analytics.edited,
					deleted_count: Math.max(analytics.deleted, deleteIds.length)
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
			dbEvents.filter(event => String(event.resource) === availabilityTargetId),
		[dbEvents, availabilityTargetId]
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

		const nextEvents =
			payload.eventId == null
				? [
						...dbEvents,
						withEventContent(
							{
								id: crypto.randomUUID(),
								resource: targetId,
								start,
								end,
								text: title
							},
							{ title, note }
						)
				  ]
				: dbEvents.map(event =>
						String(event.id) === payload.eventId
							? withEventContent({ ...event, start, end }, { title, note })
							: event
				  );

		setAvailabilityOpen(false);
		setAvailabilityFocusId(null);
		setAvailabilityTargetUserId(currentUserId);
		await persistAttendance(nextEvents, {
			created: payload.eventId == null ? 1 : 0,
			edited: payload.eventId == null ? 0 : 1,
			deleted: 0
		});
	};

	const deleteAvailabilityFromModal = async (eventId: string) => {
		const targetId = availabilityTargetId;
		if (!isAdmin && targetId !== currentUserId) {
			return;
		}
		const event = dbEvents.find(item => String(item.id) === eventId);
		if (!event || String(event.resource) !== targetId) {
			return;
		}
		if (!canEditResource(String(event.resource))) {
			return;
		}

		const nextEvents = dbEvents.filter(item => String(item.id) !== eventId);
		setAvailabilityOpen(false);
		setAvailabilityFocusId(null);
		setAvailabilityTargetUserId(currentUserId);
		await persistAttendance(nextEvents, {
			created: 0,
			edited: 0,
			deleted: 1
		});
	};

	const dismissSaveOverlay = () => {
		setSaveUiState('idle');
	};

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
						String(resource.id) !== currentUserId &&
						fuzzyMatch(query, resource.name ?? '')
				)
				.sort((a, b) => {
					const aPinned = selectedIds.includes(String(a.id)) ? 0 : 1;
					const bPinned = selectedIds.includes(String(b.id)) ? 0 : 1;
					if (aPinned !== bPinned) {
						return aPinned - bPinned;
					}
					return (a.name ?? '').localeCompare(b.name ?? '', undefined, {
						sensitivity: 'base'
					});
				})
				.slice(0, 8)
		: [];
	const highlightedSuggestionIndex =
		suggestions.length === 0
			? 0
			: Math.min(activeSuggestionIndex, suggestions.length - 1);
	const highlightedSuggestion = suggestions[highlightedSuggestionIndex];

	const userIdsWithAttendance = useMemo(() => {
		const ids = new Set<string>();
		for (const event of dbEvents) {
			ids.add(String(event.resource));
		}
		return ids;
	}, [dbEvents]);

	const orderedResources = useMemo(() => {
		const byAttendanceThenName = (
			a: DayPilot.ResourceData,
			b: DayPilot.ResourceData
		) => {
			const aHas = userIdsWithAttendance.has(String(a.id)) ? 0 : 1;
			const bHas = userIdsWithAttendance.has(String(b.id)) ? 0 : 1;
			if (aHas !== bHas) {
				return aHas - bHas;
			}
			return (a.name ?? '').localeCompare(b.name ?? '', undefined, {
				sensitivity: 'base'
			});
		};

		const loggedIn = resources.find(
			resource => String(resource.id) === currentUserId
		);
		const selected = selectedIds
			.filter(id => id !== currentUserId)
			.map(id => resources.find(resource => String(resource.id) === id))
			.filter((resource): resource is DayPilot.ResourceData => resource != null)
			.sort(byAttendanceThenName);
		const rest = resources
			.filter(
				resource =>
					resource.id != null &&
					String(resource.id) !== currentUserId &&
					!selectedIds.includes(String(resource.id))
			)
			.sort(byAttendanceThenName);
		return [...(loggedIn ? [loggedIn] : []), ...selected, ...rest];
	}, [resources, selectedIds, currentUserId, userIdsWithAttendance]);

	const toggleSelected = (id: string) => {
		updateSelectedIds(current =>
			current.includes(id)
				? current.filter(selectedId => selectedId !== id)
				: [...current, id]
		);
		setQuery('');
		setActiveSuggestionIndex(0);
		if (isNarrow) {
			setMobileRowHeaderWidth(ROW_HEADER_WIDTH_MOBILE_MAX);
		}
	};

	const onBeforeRowHeaderRender = (
		args: DayPilot.SchedulerBeforeRowHeaderRenderArgs
	) => {
		const id = String(args.row.id);
		const isLoggedIn = id === currentUserId;
		const isSelected = selectedIds.includes(id);

		if (isLoggedIn) {
			args.row.cssClass = 'resource-name-cell resource-name-cell-logged-in';
			args.row.backColor = resolveEventBarColor(id);
			args.row.fontColor = '#ffffff';
		} else if (isSelected) {
			args.row.cssClass = 'resource-name-cell resource-name-cell-selected';
			args.row.backColor = activeScheme.rowSelected;
		} else {
			args.row.cssClass = 'resource-name-cell';
		}

		args.row.areas = [];
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

	const onBeforeEventRender = (
		args: DayPilot.SchedulerBeforeEventRenderArgs
	) => {
		const editable = canEditResource(String(args.data.resource ?? ''));
		const eventData = args.data as DayPilot.EventData & {
			moveDisabled?: boolean;
			resizeDisabled?: boolean;
		};
		eventData.moveDisabled = true;
		eventData.resizeDisabled = true;

		args.data.cssClass = editable
			? 'scheduler-event-editable'
			: 'scheduler-event-readonly';

		const barColor = resolveEventBarColor(String(args.data.resource ?? ''));
		args.data.barColor = barColor;
		args.data.barBackColor = `${barColor}33`;

		const name = escapeHtml(getEventTitle(args.data));
		const preview = notePreviewText(getEventNote(args.data));
		const noteSnippet = preview
			? `<span class="scheduler-event-note-preview">${escapeHtml(
					preview
			  )}</span>`
			: '';
		args.data.html = `<span class="scheduler-event-content"><span class="scheduler-event-name">${name}</span>${noteSnippet}</span>`;
	};

	const onEventClick = (args: DayPilot.SchedulerEventClickArgs) => {
		const eventId = String(args.e.id());
		const event = dbEvents.find(item => String(item.id) === eventId);
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

	const rowHeaderWidth = isNarrow
		? mobileRowHeaderWidth
		: ROW_HEADER_WIDTH_DESKTOP;
	const fontSizeConfig = SCHEDULER_FONT_SIZE[fontSize];

	const onRowHeaderResizePointerDown = (
		event: ReactPointerEvent<HTMLDivElement>
	) => {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		rowHeaderDragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startWidth: mobileRowHeaderWidth
		};
	};

	const onRowHeaderResizePointerMove = (
		event: ReactPointerEvent<HTMLDivElement>
	) => {
		const drag = rowHeaderDragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		setMobileRowHeaderWidth(
			clampRowHeaderWidth(drag.startWidth + (event.clientX - drag.startX))
		);
	};

	const onRowHeaderResizePointerUp = (
		event: ReactPointerEvent<HTMLDivElement>
	) => {
		const drag = rowHeaderDragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		rowHeaderDragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const config: DayPilot.SchedulerConfig = useMemo(
		() => ({
			timeHeaders: [{ groupBy: 'Month' }, { groupBy: 'Day', format: 'd' }],
			scale: 'Day',
			startDate,
			days,
			cellWidth: fontSizeConfig.cellWidth,
			rowHeaderWidth,
			// Override DayPilot’s iOS default (floatingEvents off) so labels stay sticky.
			floatingEvents: true,
			rowClickHandling: 'Disabled',
			eventMoveHandling: 'Disabled',
			eventResizeHandling: 'Disabled',
			eventClickHandling: 'Enabled',
			eventDeleteHandling: 'Disabled',
			timeRangeSelectedHandling: 'Disabled'
		}),
		[startDate, days, rowHeaderWidth, fontSizeConfig.cellWidth]
	);

	return (
		<div
			data-scheduler-scheme="sandstone-flat"
			style={schemeToCssVars(activeScheme)}
		>
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

					<div className="grid min-w-0 gap-4">
						<div className="grid gap-1.5">
							<Label id="scheduler-event-bar-color-label">
								Your attendance bar colour
							</Label>
							<p className="text-xs text-muted-foreground">
								Colours your name row and the top strip on your calendar events.
								Others see this colour on your stays.
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
								<DatePickerField
									id="scheduler-start-date"
									value={startValue}
									max={endValue || undefined}
									onChange={setStartValue}
									required
									className="bg-muted"
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor="scheduler-end-date">End date</Label>
								<DatePickerField
									id="scheduler-end-date"
									value={endValue}
									min={startValue || undefined}
									onChange={setEndValue}
									required
									className="bg-muted"
								/>
							</div>
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
					onClose={closeAvailabilityModal}
					onSave={payload => {
						void saveAvailabilityFromModal(payload);
					}}
					onDelete={eventId => {
						void deleteAvailabilityFromModal(eventId);
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
									Saving attendance…
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
									Attendance has been updated.
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
									The database write did not succeed. Please try again.
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

			<h1 className="scheduler-page-title">Attendance Calendar</h1>

			<section
				aria-label="Attendance calendar"
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
								Manage attendance
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
									placeholder="Pin members to compare"
									aria-label="Pin members to compare"
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
										toggleSelected(String(highlightedSuggestion.id));
									}}
									autoComplete="off"
									className="scheduler-search-input h-11 bg-muted pl-8"
								/>
							</div>
							{suggestions.length > 0 ? (
								<ul
									id="scheduler-search-suggestions"
									role="listbox"
									className="absolute top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
									onMouseLeave={() => setActiveSuggestionIndex(0)}
								>
									{suggestions.map((resource, index) => {
										const id = String(resource.id);
										const isHighlighted = index === highlightedSuggestionIndex;
										const isPinned = selectedIds.includes(id);
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
													onClick={() => toggleSelected(id)}
													aria-label={
														isPinned
															? `Unpin ${resource.name ?? 'person'}`
															: `Pin ${resource.name ?? 'person'}`
													}
													className={cn(
														'flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm',
														'focus-visible:outline-none',
														isHighlighted
															? 'bg-accent text-accent-foreground'
															: null
													)}
												>
													<span className="min-w-0 truncate">
														{resource.name}
													</span>
													{isPinned ? (
														<PinOff
															aria-hidden
															className="size-4 shrink-0 opacity-80"
														/>
													) : (
														<Pin
															aria-hidden
															className="size-4 shrink-0 opacity-80"
														/>
													)}
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
								<div
									role="separator"
									aria-orientation="vertical"
									aria-label="Resize name column"
									aria-valuenow={rowHeaderWidth}
									aria-valuemin={ROW_HEADER_WIDTH_MOBILE_MIN}
									aria-valuemax={ROW_HEADER_WIDTH_MOBILE_MAX}
									className="scheduler-rowheader-resize"
									style={{
										left: Math.max(
											rowHeaderWidth,
											ROW_HEADER_RESIZE_HANDLE_INSET
										)
									}}
									onPointerDown={onRowHeaderResizePointerDown}
									onPointerMove={onRowHeaderResizePointerMove}
									onPointerUp={onRowHeaderResizePointerUp}
									onPointerCancel={onRowHeaderResizePointerUp}
								>
									<button
										type="button"
										className={
											rowHeaderWidth < ROW_HEADER_WIDTH_MOBILE_SHOW_NAMES_BELOW
												? 'scheduler-rowheader-resize-indicator'
												: 'scheduler-rowheader-resize-indicator scheduler-rowheader-resize-indicator-expanded'
										}
										aria-label={
											rowHeaderWidth < ROW_HEADER_WIDTH_MOBILE_SHOW_NAMES_BELOW
												? 'Show resource names'
												: 'Hide resource names'
										}
										aria-pressed={
											rowHeaderWidth >= ROW_HEADER_WIDTH_MOBILE_SHOW_NAMES_BELOW
										}
										onPointerDown={event => event.stopPropagation()}
										onClick={() => {
											setMobileRowHeaderWidth(
												rowHeaderWidth <
													ROW_HEADER_WIDTH_MOBILE_SHOW_NAMES_BELOW
													? ROW_HEADER_WIDTH_MOBILE_MAX
													: ROW_HEADER_WIDTH_MOBILE_MIN
											);
										}}
									>
										<span className="scheduler-rowheader-resize-indicator-face">
											{rowHeaderWidth <
											ROW_HEADER_WIDTH_MOBILE_SHOW_NAMES_BELOW ? (
												<>
													<span>Show names</span>
													<ChevronRight
														aria-hidden
														className="scheduler-rowheader-resize-indicator-chevron"
													/>
												</>
											) : (
												<ChevronLeft
													aria-hidden
													className="scheduler-rowheader-resize-indicator-chevron"
												/>
											)}
										</span>
									</button>
								</div>
							) : null}
							<DayPilotScheduler
								key={`${schedulerMountKey}-${currentUserId}`}
								{...config}
								theme="brown_theme"
								resources={orderedResources}
								events={dbEvents}
								onBeforeRowHeaderRender={onBeforeRowHeaderRender}
								onBeforeCellRender={onBeforeCellRender}
								onBeforeEventRender={onBeforeEventRender}
								onEventClick={onEventClick}
							/>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Scheduler;
