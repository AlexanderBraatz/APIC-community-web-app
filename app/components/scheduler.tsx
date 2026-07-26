'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { DayPilot, DayPilotScheduler } from '@daypilot/daypilot-lite-react';
import '../styles/brown_theme.css';
import '../styles/selection-separator.css';

const RESOURCES_STORAGE_KEY = 'scheduler-resources';
const EVENTS_STORAGE_KEY = 'scheduler-events';

const seedResources: DayPilot.ResourceData[] = [
	{ id: 'R1', name: 'Emma Clarke' },
	{ id: 'R2', name: 'James Patel' },
	{ id: 'R3', name: 'Sofia Rossi' },
	{ id: 'R4', name: 'Oliver and Mia Bennett' },
	{ id: 'R5', name: 'Noah Kim' },
	{ id: 'R6', name: 'Smith family' },
	{ id: 'R7', name: 'Ava Thompson' },
	{ id: 'R8', name: 'Liam and Grace Foster' },
	{ id: 'R9', name: 'Isla Nguyen' },
	{ id: 'R10', name: 'Johnson family' },
	{ id: 'R11', name: 'Ethan Brooks' },
	{ id: 'R12', name: 'Chloe and Henry Walsh' },
	{ id: 'R13', name: 'Amelia Hughes' },
	{ id: 'R14', name: 'Williams family' },
	{ id: 'R15', name: 'Lucas Martin' },
	{ id: 'R16', name: 'Harper and Jack Reid' },
	{ id: 'R17', name: 'Ella Moreno' },
	{ id: 'R18', name: 'Brown family' },
	{ id: 'R19', name: 'Benjamin Cruz' },
	{ id: 'R20', name: 'Charlotte and Oscar Daly' },
	{ id: 'R21', name: 'Mia Andersson' },
	{ id: 'R22', name: 'Taylor family' },
	{ id: 'R23', name: 'William Scott' },
	{ id: 'R24', name: 'Lily and Noah Price' },
	{ id: 'R25', name: 'Sophie Alvarez' },
	{ id: 'R26', name: 'Davis family' },
	{ id: 'R27', name: 'Daniel Okonkwo' },
	{ id: 'R28', name: 'Emily and George Lane' },
	{ id: 'R29', name: 'Grace Yamamoto' },
	{ id: 'R30', name: 'Wilson family' },
	{ id: 'R31', name: 'Henry Dubois' },
	{ id: 'R32', name: 'Olivia and Sam Carter' },
	{ id: 'R33', name: 'Lucas Ferreira' },
	{ id: 'R34', name: 'Miller family' },
	{ id: 'R35', name: 'Zoe Andersen' },
	{ id: 'R36', name: 'Nina and Paul Richter' },
	{ id: 'R37', name: 'Felix Moreau' },
	{ id: 'R38', name: 'Anderson family' },
	{ id: 'R39', name: 'Clara Costa' },
	{ id: 'R40', name: 'Marco and Elena Bianchi' }
];

const stays: { resource: string; start: string; end: string }[] = [
	// Long summer with a week away mid-stay
	{ resource: 'R1', start: '2026-06-18', end: '2026-08-05' },
	{ resource: 'R1', start: '2026-08-13', end: '2026-09-10' },
	// Classic 3-week July/August holiday
	{ resource: 'R2', start: '2026-07-11', end: '2026-08-01' },
	// Easter week only
	{ resource: 'R3', start: '2026-03-28', end: '2026-04-07' },
	// Easter + long unbroken summer + New Year
	{ resource: 'R4', start: '2026-04-01', end: '2026-04-12' },
	{ resource: 'R4', start: '2026-06-27', end: '2026-08-29' },
	{ resource: 'R4', start: '2026-12-23', end: '2027-01-04' },
	// Short late-summer + NYE
	{ resource: 'R5', start: '2026-08-15', end: '2026-08-29' },
	{ resource: 'R5', start: '2026-12-28', end: '2027-01-05' },
	// School-holiday summer split by a week home
	{ resource: 'R6', start: '2026-07-04', end: '2026-07-25' },
	{ resource: 'R6', start: '2026-08-01', end: '2026-08-29' },
	// Spring bank-holiday week + 3-week summer
	{ resource: 'R8', start: '2026-05-22', end: '2026-05-31' },
	{ resource: 'R8', start: '2026-07-18', end: '2026-08-08' },
	// Quieter September stay
	{ resource: 'R9', start: '2026-09-05', end: '2026-09-26' },
	// Almost whole summer with a week gap, plus NYE
	{ resource: 'R10', start: '2026-06-20', end: '2026-07-11' },
	{ resource: 'R10', start: '2026-07-18', end: '2026-09-05' },
	{ resource: 'R10', start: '2026-12-20', end: '2027-01-03' },
	// Easter + August fortnight/three weeks
	{ resource: 'R12', start: '2026-03-30', end: '2026-04-08' },
	{ resource: 'R12', start: '2026-08-01', end: '2026-08-22' },
	// Early June only
	{ resource: 'R13', start: '2026-06-06', end: '2026-06-20' },
	// Continuous ~2.5 month summer
	{ resource: 'R14', start: '2026-06-28', end: '2026-09-12' },
	// New Year only
	{ resource: 'R15', start: '2026-12-27', end: '2027-01-06' },
	// Easter + summer three weeks + NYE
	{ resource: 'R16', start: '2026-04-02', end: '2026-04-10' },
	{ resource: 'R16', start: '2026-07-25', end: '2026-08-15' },
	{ resource: 'R16', start: '2026-12-22', end: '2027-01-02' },
	// Autumn fortnight
	{ resource: 'R17', start: '2026-10-10', end: '2026-10-24' },
	// July/August with a week out (friends visiting elsewhere)
	{ resource: 'R18', start: '2026-07-01', end: '2026-07-26' },
	{ resource: 'R18', start: '2026-08-02', end: '2026-08-30' },
	// Split early + late summer
	{ resource: 'R20', start: '2026-06-13', end: '2026-06-27' },
	{ resource: 'R20', start: '2026-08-22', end: '2026-09-05' },
	// Midsummer three weeks
	{ resource: 'R21', start: '2026-07-04', end: '2026-07-25' },
	// Easter fortnight + August + NYE
	{ resource: 'R22', start: '2026-03-27', end: '2026-04-11' },
	{ resource: 'R22', start: '2026-08-01', end: '2026-08-31' },
	{ resource: 'R22', start: '2026-12-24', end: '2027-01-05' },
	// Long continuous summer (~10 weeks)
	{ resource: 'R24', start: '2026-06-27', end: '2026-09-05' },
	// Spring week + Ferragosto fortnight
	{ resource: 'R25', start: '2026-04-18', end: '2026-04-25' },
	{ resource: 'R25', start: '2026-08-08', end: '2026-08-22' },
	// Full July school holiday
	{ resource: 'R26', start: '2026-07-04', end: '2026-08-01' },
	// Quiet January winter break
	{ resource: 'R27', start: '2026-01-10', end: '2026-01-24' },
	// Long summer with a week gap + Christmas (home before NYE)
	{ resource: 'R28', start: '2026-06-15', end: '2026-07-04' },
	{ resource: 'R28', start: '2026-07-11', end: '2026-08-22' },
	{ resource: 'R28', start: '2026-12-19', end: '2026-12-28' },
	// Early spring + September (avoid August heat)
	{ resource: 'R29', start: '2026-03-20', end: '2026-03-30' },
	{ resource: 'R29', start: '2026-09-12', end: '2026-09-26' },
	// Two summer blocks with a fortnight gap
	{ resource: 'R30', start: '2026-07-11', end: '2026-08-01' },
	{ resource: 'R30', start: '2026-08-15', end: '2026-09-05' },
	// May + late summer/early autumn
	{ resource: 'R32', start: '2026-05-02', end: '2026-05-16' },
	{ resource: 'R32', start: '2026-08-29', end: '2026-09-19' },
	// February half-term + summer month
	{ resource: 'R33', start: '2026-02-14', end: '2026-02-28' },
	{ resource: 'R33', start: '2026-07-18', end: '2026-08-15' },
	// Nearly 3 months with an August week out + NYE
	{ resource: 'R34', start: '2026-06-20', end: '2026-08-08' },
	{ resource: 'R34', start: '2026-08-16', end: '2026-09-19' },
	{ resource: 'R34', start: '2026-12-21', end: '2027-01-04' },
	// Easter + September
	{ resource: 'R36', start: '2026-04-01', end: '2026-04-09' },
	{ resource: 'R36', start: '2026-09-05', end: '2026-09-26' },
	// Full August (continental style)
	{ resource: 'R37', start: '2026-08-01', end: '2026-08-29' },
	// February week + long Jul–Sep
	{ resource: 'R38', start: '2026-02-14', end: '2026-02-21' },
	{ resource: 'R38', start: '2026-07-18', end: '2026-09-05' },
	// Short spring + short autumn hops
	{ resource: 'R39', start: '2026-05-08', end: '2026-05-15' },
	{ resource: 'R39', start: '2026-10-02', end: '2026-10-09' },
	// Easter, long summer with a week break, NYE
	{ resource: 'R40', start: '2026-03-29', end: '2026-04-08' },
	{ resource: 'R40', start: '2026-06-20', end: '2026-07-25' },
	{ resource: 'R40', start: '2026-08-02', end: '2026-09-12' },
	{ resource: 'R40', start: '2026-12-26', end: '2027-01-06' }
];

const seedEvents: DayPilot.EventData[] = stays.map((stay, index) => ({
	id: index + 1,
	resource: stay.resource,
	start: `${stay.start}T00:00:00`,
	end: `${stay.end}T00:00:00`,
	text:
		seedResources.find(resource => resource.id === stay.resource)?.name ?? ''
}));

const defaultStart = DayPilot.Date.today().firstDayOfWeek(1); // Monday
const defaultEnd = new DayPilot.Date('2027-01-10');
const defaultDays = new DayPilot.Duration(
	defaultStart,
	defaultEnd.addDays(1)
).totalDays();

function readOrSeedLocalStorage<T>(key: string, seed: T): T {
	const raw = localStorage.getItem(key);
	if (raw != null) {
		try {
			return JSON.parse(raw) as T;
		} catch {
			// Corrupted value — fall through and re-seed.
		}
	}
	localStorage.setItem(key, JSON.stringify(seed));
	return seed;
}

const localStorageCache = new Map<string, unknown>();
const localStorageListeners = new Map<string, Set<() => void>>();

function subscribeLocalStorage(key: string, onStoreChange: () => void) {
	let listeners = localStorageListeners.get(key);
	if (!listeners) {
		listeners = new Set();
		localStorageListeners.set(key, listeners);
	}
	listeners.add(onStoreChange);

	const onStorage = (event: StorageEvent) => {
		if (event.key === key || event.key === null) {
			localStorageCache.delete(key);
			onStoreChange();
		}
	};
	window.addEventListener('storage', onStorage);
	return () => {
		listeners.delete(onStoreChange);
		window.removeEventListener('storage', onStorage);
	};
}

function getLocalStorageSnapshot<T>(key: string, seed: T): T {
	const cached = localStorageCache.get(key);
	if (cached !== undefined) {
		return cached as T;
	}
	const value = readOrSeedLocalStorage(key, seed);
	localStorageCache.set(key, value);
	return value;
}

function writeLocalStorage<T>(key: string, value: T) {
	localStorage.setItem(key, JSON.stringify(value));
	localStorageCache.set(key, value);
	localStorageListeners.get(key)?.forEach(listener => listener());
}

function useLocalStorageState<T>(
	key: string,
	seed: T
): [T, (update: T | ((prev: T) => T)) => void] {
	const value = useSyncExternalStore(
		onStoreChange => subscribeLocalStorage(key, onStoreChange),
		() => getLocalStorageSnapshot(key, seed),
		() => seed
	);

	const setValue = (update: T | ((prev: T) => T)) => {
		const prev = getLocalStorageSnapshot(key, seed);
		const next =
			typeof update === 'function'
				? (update as (prev: T) => T)(prev)
				: update;
		writeLocalStorage(key, next);
	};

	return [value, setValue];
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

function normalizeSearchText(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/** Case-insensitive fuzzy match: each query word must appear as a subsequence in the name. */
function fuzzyMatch(query: string, name: string) {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) {
		return false;
	}

	const normalizedName = normalizeSearchText(name);
	const words = normalizedQuery.split(' ');

	return words.every(word => {
		if (normalizedName.includes(word)) {
			return true;
		}

		let nameIndex = 0;
		for (const char of word) {
			nameIndex = normalizedName.indexOf(char, nameIndex);
			if (nameIndex === -1) {
				return false;
			}
			nameIndex += 1;
		}
		return true;
	});
}

const Scheduler = () => {
	const [resources] = useLocalStorageState(
		RESOURCES_STORAGE_KEY,
		seedResources
	);
	const [eventRows, setEventRows] = useLocalStorageState(
		EVENTS_STORAGE_KEY,
		seedEvents
	);
	const [startValue, setStartValue] = useState(toInputDate(defaultStart));
	const [endValue, setEndValue] = useState(toInputDate(defaultEnd));
	const [query, setQuery] = useState('');
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	// Temp stand-in for auth: user id === resource id
	const [tempLoggedInID] = useState('R6');

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

	const orderedResources = useMemo(() => {
		const loggedIn = resources.find(
			resource => String(resource.id) === tempLoggedInID
		);
		const selected = selectedIds
			.filter(id => id !== tempLoggedInID)
			.map(id => resources.find(resource => String(resource.id) === id))
			.filter(
				(resource): resource is DayPilot.ResourceData => resource != null
			);
		const rest = resources.filter(
			resource =>
				resource.id != null &&
				String(resource.id) !== tempLoggedInID &&
				!selectedIds.includes(String(resource.id))
		);
		return [...(loggedIn ? [loggedIn] : []), ...selected, ...rest];
	}, [resources, selectedIds, tempLoggedInID]);

	const addSelected = (id: string) => {
		setSelectedIds(current =>
			current.includes(id) ? current : [...current, id]
		);
		setQuery('');
	};

	const toggleSelected = (id: string) => {
		setSelectedIds(current =>
			current.includes(id)
				? current.filter(selectedId => selectedId !== id)
				: [...current, id]
		);
		setQuery('');
	};

	const onBeforeRowHeaderRender = (
		args: DayPilot.SchedulerBeforeRowHeaderRenderArgs
	) => {
		const id = String(args.row.id);
		const isLoggedIn = id === tempLoggedInID;
		const isSelected = selectedIds.includes(id);

		if (isLoggedIn) {
			args.row.cssClass = isSelected
				? 'resource-name-cell resource-name-cell-logged-in resource-name-cell-has-deselect'
				: 'resource-name-cell resource-name-cell-logged-in';
			args.row.backColor = '#c9a227';
		} else if (isSelected) {
			args.row.cssClass =
				'resource-name-cell resource-name-cell-selected';
			args.row.backColor = '#3d8b5a';
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
		if (resourceId === tempLoggedInID) {
			// Yellow tint for the logged-in row; weekends a touch lighter
			args.cell.properties.backColor = args.cell.properties.business
				? '#fef6d9'
				: '#fffbec';
			return;
		}
		if (!selectedIds.includes(resourceId)) {
			return;
		}
		// Keep weekends (non-business) a touch lighter than weekdays
		args.cell.properties.backColor = args.cell.properties.business
			? '#e5f2e9'
			: '#f3faf6';
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
				String(event.id) === String(id) ? { ...event, ...patch } : event
			)
		);
	};

	const onEventMoved = (args: DayPilot.SchedulerEventMovedArgs) => {
		const resourceName =
			resources.find(resource => String(resource.id) === String(args.newResource))
				?.name ?? '';
		setEventRows(current =>
			current.map(event =>
				String(event.id) === String(args.e.id())
					? {
							...event,
							start: args.newStart.toString(),
							end: args.newEnd.toString(),
							resource: args.newResource,
							text: resourceName
						}
					: event
			)
		);
	};

	const onEventResized = (args: DayPilot.SchedulerEventResizedArgs) => {
		persistEventChange(args.e.id(), {
			start: args.newStart.toString(),
			end: args.newEnd.toString()
		});
	};

	const deleteEvent = (id: DayPilot.EventId) => {
		setEventRows(current =>
			current.filter(event => String(event.id) !== String(id))
		);
	};

	const onBeforeEventRender = (
		args: DayPilot.SchedulerBeforeEventRenderArgs
	) => {
		const name = escapeHtml(String(args.data.text ?? ''));
		args.data.html = `<span class="scheduler-event-content"><span class="scheduler-event-name">${name}</span><span class="scheduler-event-delete-mark" title="Delete" onmousedown="event.stopPropagation()">×</span></span>`;
	};

	const onEventClick = (args: DayPilot.SchedulerEventClickArgs) => {
		const target = args.originalEvent.target;
		if (
			target instanceof Element &&
			target.closest('.scheduler-event-delete-mark')
		) {
			args.preventDefault();
			deleteEvent(args.e.id());
		}
	};

	const onTimeRangeSelected = (
		args: DayPilot.SchedulerTimeRangeSelectedArgs
	) => {
		const resourceName =
			resources.find(resource => String(resource.id) === String(args.resource))
				?.name ?? '';
		setEventRows(current => {
			const nextId =
				current.reduce((max, event) => {
					const id = Number(event.id);
					return Number.isFinite(id) ? Math.max(max, id) : max;
				}, 0) + 1;
			return [
				...current,
				{
					id: nextId,
					resource: args.resource,
					start: args.start.toString(),
					end: args.end.toString(),
					text: resourceName
				}
			];
		});
		args.control.clearSelection();
	};

	const config: DayPilot.SchedulerConfig = useMemo(
		() => ({
			timeHeaders: [{ groupBy: 'Month' }, { groupBy: 'Day', format: 'd' }],
			scale: 'Day',
			startDate,
			days,
			cellWidth: 28,
			rowHeaderWidth: 180,
			rowClickHandling: 'Enabled',
			eventMoveHandling: 'Update',
			eventResizeHandling: 'Update',
			eventClickHandling: 'Enabled',
			eventDeleteHandling: 'Disabled',
			timeRangeSelectedHandling: 'Enabled'
		}),
		[startDate, days]
	);

	return (
		<div>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: '1rem',
					alignItems: 'end',
					marginBottom: '1rem'
				}}
			>
				<label style={{ display: 'grid', gap: '0.35rem' }}>
					<span>Start date</span>
					<input
						type="date"
						value={startValue}
						max={endValue || undefined}
						onChange={event => setStartValue(event.target.value)}
						required
					/>
				</label>
				<label style={{ display: 'grid', gap: '0.35rem' }}>
					<span>End date</span>
					<input
						type="date"
						value={endValue}
						min={startValue || undefined}
						onChange={event => setEndValue(event.target.value)}
						required
					/>
				</label>
				{error ? (
					<p style={{ color: '#8a1f1f', margin: 0 }} role="alert">
						{error}
					</p>
				) : null}
			</div>

			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: '0.5rem',
					alignItems: 'center',
					marginBottom: '1rem'
				}}
			>
				<div style={{ position: 'relative', minWidth: '16rem' }}>
					<label style={{ display: 'grid', gap: '0.35rem' }}>
						<span>Search people</span>
						<input
							type="search"
							value={query}
							placeholder="Type a name…"
							onChange={event => setQuery(event.target.value)}
							autoComplete="off"
						/>
					</label>
					{suggestions.length > 0 ? (
						<ul
							style={{
								position: 'absolute',
								zIndex: 20,
								left: 0,
								right: 0,
								top: '100%',
								margin: '0.25rem 0 0',
								padding: 0,
								listStyle: 'none',
								background: '#fff',
								border: '1px solid #c8c0b4',
								borderRadius: '4px',
								boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
								maxHeight: '14rem',
								overflowY: 'auto'
							}}
						>
							{suggestions.map(resource => {
								const id = String(resource.id);
								return (
									<li key={id}>
										<button
											type="button"
											onClick={() => addSelected(id)}
											style={{
												display: 'block',
												width: '100%',
												textAlign: 'left',
												padding: '0.5rem 0.75rem',
												border: 'none',
												background: 'transparent',
												cursor: 'pointer'
											}}
										>
											{resource.name}
										</button>
									</li>
								);
							})}
						</ul>
					) : null}
				</div>
			</div>

			<DayPilotScheduler
				{...config}
				theme="brown_theme"
				resources={orderedResources}
				events={eventRows}
				onBeforeRowHeaderRender={onBeforeRowHeaderRender}
				onBeforeCellRender={onBeforeCellRender}
				onBeforeEventRender={onBeforeEventRender}
				onRowClick={onRowClick}
				onEventClick={onEventClick}
				onEventMoved={onEventMoved}
				onEventResized={onEventResized}
				onTimeRangeSelected={onTimeRangeSelected}
			/>
		</div>
	);
};

export default Scheduler;
