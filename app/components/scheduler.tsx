'use client';

import { useMemo, useState } from 'react';
import { DayPilot, DayPilotScheduler } from '@daypilot/daypilot-lite-react';
import '../styles/brown_theme.css';
import '../styles/selection-separator.css';

const resources: DayPilot.ResourceData[] = [
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

const events: DayPilot.EventData[] = stays.map((stay, index) => ({
	id: index + 1,
	resource: stay.resource,
	start: `${stay.start}T00:00:00`,
	end: `${stay.end}T00:00:00`,
	text: resources.find(resource => resource.id === stay.resource)?.name ?? ''
}));

const defaultStart = new DayPilot.Date('2026-03-01');
const defaultEnd = new DayPilot.Date('2027-01-10');
const defaultDays = new DayPilot.Duration(
	defaultStart,
	defaultEnd.addDays(1)
).totalDays();

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
	const [eventRows] = useState(events);
	const [startValue, setStartValue] = useState(toInputDate(defaultStart));
	const [endValue, setEndValue] = useState(toInputDate(defaultEnd));
	const [query, setQuery] = useState('');
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
		if (selectedIds.length === 0) {
			return resources;
		}
		const selected = selectedIds
			.map(id => resources.find(resource => String(resource.id) === id))
			.filter(
				(resource): resource is DayPilot.ResourceData => resource != null
			);
		return [
			...selected,
			...resources.filter(
				resource =>
					resource.id != null && !selectedIds.includes(String(resource.id))
			)
		];
	}, [selectedIds]);

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
		const isSelected = selectedIds.includes(id);

		args.row.cssClass = isSelected
			? 'resource-name-cell resource-name-cell-selected'
			: 'resource-name-cell';
		if (isSelected) {
			args.row.backColor = '#3d8b5a';
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
						fontColor: '#ffffff',
						verticalAlignment: 'center',
						horizontalAlignment: 'center',
						toolTip: 'Deselect',
						action: 'None'
					}
				]
			: [];
	};

	const onBeforeCellRender = (args: DayPilot.SchedulerBeforeCellRenderArgs) => {
		if (!selectedIds.includes(String(args.cell.resource))) {
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

	const config: DayPilot.SchedulerConfig = useMemo(
		() => ({
			timeHeaders: [{ groupBy: 'Month' }, { groupBy: 'Day', format: 'd' }],
			scale: 'Day',
			startDate,
			days,
			cellWidth: 50,
			rowHeaderWidth: 180,
			rowClickHandling: 'Enabled'
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
				onRowClick={onRowClick}
			/>
		</div>
	);
};

export default Scheduler;
