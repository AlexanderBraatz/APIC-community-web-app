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
import { CalendarDays, ChevronDown, ChevronUp, Search, Settings } from 'lucide-react';
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
import {
	COLOR_SCHEME_IDS,
	COLOR_SCHEMES,
	schemeToCssVars,
	type ColorSchemeId
} from '@/app/lib/color-schemes';

const RESOURCES_STORAGE_KEY = 'scheduler-resources';
const EVENTS_STORAGE_KEY = 'scheduler-events-v2';
const MOCK_LOGIN_STORAGE_KEY = 'scheduler-mock-login-user';
const MEMBER_SELECTIONS_STORAGE_KEY = 'scheduler-member-selections-v1';

/** Switch between demo members (1) and Castelfalfi community data (2). */
const ACTIVE_SEED_DATA_SET = 2 as const;

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

const seedResources2: DayPilot.ResourceData[] = [
	{ id: 'R1', name: 'Johnny and Karen' },
	{ id: 'R2', name: 'Stephan & Anne Knichel' },
	{ id: 'R3', name: 'Philippe Roose & Mimi Claus' },
	{ id: 'R4', name: 'Eva und Thomas Schröer' },
	{ id: 'R5', name: 'Anke und Norbert Frank' },
	{ id: 'R6', name: 'Henk & Janine van Cappelle' },
	{ id: 'R7', name: 'Joanne and Dave Weick' },
	{ id: 'R8', name: 'matthiasdebbystebler' },
	{ id: 'R9', name: 'Carmen Walsh' },
	{ id: 'R10', name: 'Gerald und Susanne Wagener' },
	{ id: 'R11', name: 'Hugh & Susan Barit' },
	{ id: 'R12', name: 'Thomas Schmidt' }
];

type SeedStay = { resource: string; start: string; end: string; note?: string };

type OverlapStay = {
	resource: string;
	start: string;
	end: string;
	title: string;
	note: string;
};

/** Inclusive checkout dates from member records → exclusive scheduler end dates. */
const stays2: SeedStay[] = [
	{ resource: 'R1', start: '2026-09-11', end: '2026-10-30' },
	{ resource: 'R2', start: '2026-07-13', end: '2026-08-04' },
	{ resource: 'R3', start: '2026-07-09', end: '2026-08-25' },
	{ resource: 'R4', start: '2026-08-22', end: '2026-09-13' },
	{ resource: 'R5', start: '2026-07-15', end: '2026-07-29' },
	{
		resource: 'R6',
		start: '2026-07-09',
		end: '2026-07-27',
		note: 'Enjoying Italy!'
	},
	{
		resource: 'R7',
		start: '2026-10-21',
		end: '2026-10-29',
		note: 'see you then!'
	},
	{ resource: 'R8', start: '2026-07-05', end: '2026-08-10' },
	{ resource: 'R8', start: '2026-10-04', end: '2026-10-19' },
	{ resource: 'R9', start: '2026-08-31', end: '2026-10-30' },
	{ resource: 'R10', start: '2026-09-05', end: '2026-09-27' },
	{
		resource: 'R11',
		start: '2026-07-11',
		end: '2026-07-23',
		note: 'Lookinf forward to getting back!'
	},
	{ resource: 'R11', start: '2026-08-29', end: '2026-10-05' },
	{
		resource: 'R12',
		start: '2026-06-17',
		end: '2027-06-18',
		note: 'Almost always in Castelfalfi.'
	}
];

const overlapStays2: OverlapStay[] = [
	{
		resource: 'R2',
		start: '2026-07-21',
		end: '2026-07-30',
		title: 'Trip to Piemont',
		note: '21/07 until 29/07 Trip to Piemont'
	},
	{
		resource: 'R4',
		start: '2026-08-31',
		end: '2026-09-05',
		title: 'Vespa tour',
		note: 'We are on a Vespa tour from 31st August to 4th September'
	}
];

const seedStayNotes = [
	'We are new to the community and excited to settle in.',
	'Cannot wait to see you all again this summer.',
	'Quiet working weeks — happy to join evening meals.',
	'Bringing the kids; looking forward to the pool days.',
	'First long stay — please say hello when you see us.',
	'Back for our favourite stretch of the year.'
];

const overlapStays: {
	resource: string;
	start: string;
	end: string;
	title: string;
	note: string;
}[] = [
	{
		resource: 'R6',
		start: '2026-07-10',
		end: '2026-07-18',
		title: 'Son is visiting',
		note: 'He arrives Friday evening — spare bed ready in the annex.'
	},
	{
		resource: 'R6',
		start: '2026-08-08',
		end: '2026-08-12',
		title: 'Attending street festival',
		note: 'Day trips into town; evenings back at the house.'
	},
	{
		resource: 'R1',
		start: '2026-07-01',
		end: '2026-07-12',
		title: 'Partner is visiting',
		note: 'Looking forward to introducing everyone around the table.'
	},
	{
		resource: 'R4',
		start: '2026-07-15',
		end: '2026-07-22',
		title: 'Friends from home',
		note: 'Two couples joining us for a week of walks and cooking.'
	},
	{
		resource: 'R10',
		start: '2026-08-05',
		end: '2026-08-14',
		title: 'Birthday weekend',
		note: 'Small celebration on the Saturday — all welcome for cake.'
	},
	{
		resource: 'R18',
		start: '2026-07-12',
		end: '2026-07-20',
		title: 'Parents visiting',
		note: 'Slower pace while they are here; mornings are quiet.'
	},
	{
		resource: 'R28',
		start: '2026-07-20',
		end: '2026-07-28',
		title: 'Workshop week',
		note: 'Away most afternoons for a ceramics course in the village.'
	},
	{
		resource: 'R40',
		start: '2026-08-10',
		end: '2026-08-18',
		title: 'Niece is visiting',
		note: 'Teenager in tow — pool and bike rides planned.'
	}
];

function buildSeedEvent(
	id: number,
	resource: string,
	start: string,
	end: string,
	title: string,
	note: string
): DayPilot.EventData {
	return {
		id,
		resource,
		start: `${start}T00:00:00`,
		end: `${end}T00:00:00`,
		text: title,
		tags: { title, note, saveStatus: 'ready' }
	};
}

function buildSeedEvents(
	resources: DayPilot.ResourceData[],
	stayRows: SeedStay[],
	overlapRows: OverlapStay[],
	fallbackNotes: string[] = []
): DayPilot.EventData[] {
	return [
		...stayRows.map((stay, index) => {
			const memberName =
				resources.find(resource => resource.id === stay.resource)?.name ?? '';
			const note =
				stay.note ?? fallbackNotes[index % fallbackNotes.length] ?? '';
			return buildSeedEvent(
				index + 1,
				stay.resource,
				stay.start,
				stay.end,
				memberName,
				note
			);
		}),
		...overlapRows.map((stay, index) =>
			buildSeedEvent(
				stayRows.length + index + 1,
				stay.resource,
				stay.start,
				stay.end,
				stay.title,
				stay.note
			)
		)
	];
}

const seedEvents = buildSeedEvents(seedResources, stays, overlapStays, seedStayNotes);
const seedEvents2 = buildSeedEvents(seedResources2, stays2, overlapStays2);

const seedResourcesBySet = {
	1: seedResources,
	2: seedResources2
} as const;

const seedEventsBySet = {
	1: seedEvents,
	2: seedEvents2
} as const;

const activeSeedResources = seedResourcesBySet[ACTIVE_SEED_DATA_SET];
const activeSeedEvents = seedEventsBySet[ACTIVE_SEED_DATA_SET];
const defaultMockLoginId = String(activeSeedResources[0]?.id ?? 'R1');

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

function readOrSeedLocalStorage<T>(key: string, seed: T): T {
	if (typeof window === 'undefined') {
		return seed;
	}
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
			typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
		writeLocalStorage(key, next);
	};

	return [value, setValue];
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

const MOCK_SAVE_DELAY_MS = 1200;

type MockSavePayload = {
	role: 'admin' | 'user';
	userId: string;
	/** Events to commit (already excluding soft-deletes). */
	events: DayPilot.EventData[];
	/** Current mock database contents used as the merge base. */
	baselineEvents: DayPilot.EventData[];
};

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

/** Mock remote write: delay, then commit. Returns the next DB snapshot. */
async function mockDatabaseWrite(
	payload: MockSavePayload
): Promise<DayPilot.EventData[]> {
	await new Promise<void>(resolve => {
		setTimeout(resolve, MOCK_SAVE_DELAY_MS);
	});

	const committed = payload.events.map(stripDraftTags);
	if (payload.role === 'admin') {
		return committed;
	}

	return [
		...payload.baselineEvents
			.filter(event => String(event.resource) !== payload.userId)
			.map(stripDraftTags),
		...committed
	];
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
				: (event.tags?.saveStatus ?? 'unsaved')
		}
	};
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

type SchedulerFontSize = 'small' | 'medium' | 'large';

const SCHEDULER_FONT_SIZE: Record<SchedulerFontSize, { cellWidth: number }> = {
	small: { cellWidth: 28 },
	medium: { cellWidth: 32 },
	large: { cellWidth: 38 }
};

const Scheduler = () => {
	const [resources] = useLocalStorageState(
		`${RESOURCES_STORAGE_KEY}-set-${ACTIVE_SEED_DATA_SET}`,
		activeSeedResources
	);
	/** Mock database: localStorage, written only on successful Save. */
	const [dbEvents, setDbEvents] = useLocalStorageState(
		`${EVENTS_STORAGE_KEY}-set-${ACTIVE_SEED_DATA_SET}`,
		activeSeedEvents
	);
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
	const [tempLoggedInID, setTempLoggedInID] = useLocalStorageState(
		`${MOCK_LOGIN_STORAGE_KEY}-set-${ACTIVE_SEED_DATA_SET}`,
		defaultMockLoginId
	);
	const [memberSelectionsByUser, setMemberSelectionsByUser] = useLocalStorageState<
		Record<string, string[]>
	>(
		`${MEMBER_SELECTIONS_STORAGE_KEY}-set-${ACTIVE_SEED_DATA_SET}`,
		{}
	);
	const [tempIsAdmin, setTempIsAdmin] = useState(false);
	const [saveUiState, setSaveUiState] = useState<SaveUiState>('idle');
	const [savedThisSession, setSavedThisSession] = useState(false);
	const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
	const [availabilityOpen, setAvailabilityOpen] = useState(false);
	const [availabilityFocusId, setAvailabilityFocusId] = useState<string | null>(
		null
	);
	const [readOnlyEvent, setReadOnlyEvent] = useState<DayPilot.EventData | null>(
		null
	);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const unsavedHistoryPushedRef = useRef(false);
	const allowLeaveRef = useRef(false);
	const isNarrow = useIsNarrowScreen();
	const [namesCollapsed, setNamesCollapsed] = useState(true);
	const [fontSize, setFontSize] = useState<SchedulerFontSize>('medium');
	const [colorScheme, setColorScheme] = useState<ColorSchemeId>('sandstone');
	const [colorSchemeOpen, setColorSchemeOpen] = useState(true);
	const [hiddenColorSchemes, setHiddenColorSchemes] = useState<ColorSchemeId[]>(
		[]
	);
	const visibleColorSchemeIds = useMemo(
		() => COLOR_SCHEME_IDS.filter(id => !hiddenColorSchemes.includes(id)),
		[hiddenColorSchemes]
	);
	const activeScheme = COLOR_SCHEMES[colorScheme];

	const storedPinnedIds = useMemo(
		() =>
			filterPinnedMemberIds(
				memberSelectionsByUser[tempLoggedInID] ?? [],
				tempLoggedInID,
				resources
			),
		[memberSelectionsByUser, tempLoggedInID, resources]
	);
	const selectedIds = selectedIdsDraft ?? storedPinnedIds;

	const updateSelectedIds = (
		update: string[] | ((prev: string[]) => string[])
	) => {
		setSelectedIdsDraft(prev => {
			const base = prev ?? storedPinnedIds;
			return typeof update === 'function' ? update(base) : update;
		});
	};

	useEffect(() => {
		setMemberSelectionsByUser(prev => {
			const current = prev[tempLoggedInID] ?? [];
			if (
				current.length === selectedIds.length &&
				current.every((id, index) => id === selectedIds[index])
			) {
				return prev;
			}
			return { ...prev, [tempLoggedInID]: selectedIds };
		});
	}, [selectedIds, tempLoggedInID, setMemberSelectionsByUser]);

	const switchLoginUser = (userId: string) => {
		if (userId === tempLoggedInID) {
			return;
		}
		setTempLoggedInID(userId);
		setQuery('');
		setActiveSuggestionIndex(0);
		const saved = memberSelectionsByUser[userId] ?? [];
		setSelectedIdsDraft(filterPinnedMemberIds(saved, userId, resources));
		setSchedulerMountKey(key => key + 1);
	};

	const loginOptions = useMemo(
		() =>
			[...resources].sort((a, b) =>
				(a.name ?? '').localeCompare(b.name ?? '', undefined, {
					sensitivity: 'base'
				})
			),
		[resources]
	);

	const hideColorScheme = (id: ColorSchemeId) => {
		const nextHidden = [...hiddenColorSchemes, id];
		setHiddenColorSchemes(nextHidden);
		if (colorScheme === id) {
			const remaining = COLOR_SCHEME_IDS.filter(
				schemeId => !nextHidden.includes(schemeId)
			);
			if (remaining[0]) {
				setColorScheme(remaining[0]);
			}
		}
	};

	const canEditResource = (resourceId: string) =>
		tempIsAdmin || resourceId === tempLoggedInID;

	const hasUnsavedChanges = useMemo(
		() =>
			eventRows.some(event => {
				const resourceId = String(event.resource ?? '');
				if (!(tempIsAdmin || resourceId === tempLoggedInID)) {
					return false;
				}
				return (
					getEventSaveStatus(event) === 'unsaved' || isMarkedForDeletion(event)
				);
			}),
		[eventRows, tempIsAdmin, tempLoggedInID]
	);

	const saveChanges = async (eventsOverride?: DayPilot.EventData[]) => {
		if (saveUiState === 'loading') {
			return;
		}

		const rows = eventsOverride ?? eventRows;
		const hasUnsavedInRows = rows.some(event => {
			const resourceId = String(event.resource ?? '');
			if (!(tempIsAdmin || resourceId === tempLoggedInID)) {
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

		const ownedEvents = tempIsAdmin
			? rows
			: rows.filter(event => String(event.resource) === tempLoggedInID);
		const eventsToSave = ownedEvents.filter(
			event => !isMarkedForDeletion(event)
		);
		const unsavedIds = new Set(
			eventsToSave
				.filter(event => getEventSaveStatus(event) === 'unsaved')
				.map(event => String(event.id))
		);

		setSaveUiState('loading');
		try {
			const nextDb = await mockDatabaseWrite({
				role: tempIsAdmin ? 'admin' : 'user',
				userId: tempLoggedInID,
				events: eventsToSave,
				baselineEvents: dbEvents
			});
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
		} catch {
			setSaveUiState('error');
		}
	};

	const userAvailabilityEvents = useMemo(
		() => eventRows.filter(event => String(event.resource) === tempLoggedInID),
		[eventRows, tempLoggedInID]
	);

	const closeAvailabilityModal = () => {
		setAvailabilityOpen(false);
		setAvailabilityFocusId(null);
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
		const resourceName =
			resources.find(resource => String(resource.id) === tempLoggedInID)
				?.name ?? '';
		const title = payload.title.trim() || resourceName;
		const note = payload.note.trim();
		const start = `${payload.startValue}T00:00:00`;
		const end = `${payload.endValue}T00:00:00`;
		const current = draftEvents ?? dbEvents;

		const nextEvents =
			payload.eventId == null
				? [
						...current,
						withEventSaveStatus(
							withEventContent(
								{
									id:
										current.reduce((max, event) => {
											const id = Number(event.id);
											return Number.isFinite(id) ? Math.max(max, id) : max;
										}, 0) + 1,
									resource: tempLoggedInID,
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
		const isLoggedIn = id === tempLoggedInID;
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
		if (resourceId === tempLoggedInID) {
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

		if (String(event.resource) === tempLoggedInID) {
			setReadOnlyEvent(null);
			setAvailabilityFocusId(eventId);
			setAvailabilityOpen(true);
			return;
		}

		setAvailabilityOpen(false);
		setAvailabilityFocusId(null);
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
			const nextId =
				current.reduce((max, event) => {
					const id = Number(event.id);
					return Number.isFinite(id) ? Math.max(max, id) : max;
				}, 0) + 1;
			return [
				...current,
				withEventSaveStatus(
					withEventContent(
						{
							id: nextId,
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
			rowClickHandling: 'Enabled',
			eventMoveHandling: 'Update',
			eventResizeHandling: 'Update',
			eventClickHandling: 'Enabled',
			eventDeleteHandling: 'Disabled',
			timeRangeSelectedHandling: 'Enabled'
		}),
		[startDate, days, rowHeaderWidth, fontSizeConfig.cellWidth]
	);

	return (
		<div
			data-scheduler-scheme={colorScheme}
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
							Adjust the calendar date range and text size.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4">
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
										setFontSize(next);
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

			{availabilityOpen && !tempIsAdmin ? (
				<AvailabilityModal
					open
					userEvents={userAvailabilityEvents}
					defaultTitle={
						resources.find(resource => String(resource.id) === tempLoggedInID)
							?.name ?? ''
					}
					initialEventId={availabilityFocusId}
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
									{tempIsAdmin
										? 'Writing all events to the database.'
										: 'Writing your events to the database.'}
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
									{tempIsAdmin
										? 'All event updates were written successfully.'
										: 'Your event updates were written successfully.'}
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

			<h1 className="py-3 text-center text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
				Attendance Calendar
			</h1>

			<section
				aria-label="Availability calendar"
				className="scheduler-shell"
			>
				<div className="scheduler-shell-header">
					<div className="relative min-w-64 flex-1 basis-64 max-w-md">
						<div className="relative">
							<Search
								aria-hidden
								className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								id="scheduler-search-people"
								type="search"
								value={query}
								placeholder="Find people to compare availability"
								aria-label="Find people to compare availability"
								aria-autocomplete="list"
								aria-controls={
									suggestions.length > 0
										? 'scheduler-search-suggestions'
										: undefined
								}
								aria-activedescendant={
									highlightedSuggestion?.id != null
										? `scheduler-search-option-${String(highlightedSuggestion.id)}`
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
								className="h-11 bg-muted pl-8"
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
					<div className="flex flex-wrap items-center gap-3 sm:ml-auto">
						{!tempIsAdmin ? (
							<Button
								type="button"
								size="lg"
								onClick={() => {
									setAvailabilityFocusId(null);
									setAvailabilityOpen(true);
								}}
								disabled={saveUiState === 'loading'}
								className="scheme-primary-btn"
							>
								<CalendarDays
									data-icon="inline-start"
									aria-hidden
								/>
								Manage your availability
							</Button>
						) : null}
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={() => setSettingsOpen(true)}
						>
							<Settings
								data-icon="inline-start"
								aria-hidden
							/>
							Settings
						</Button>
					</div>
					{error ? (
						<p
							className="basis-full text-sm text-destructive"
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
									namesCollapsed ? 'Show resource names' : 'Hide resource names'
								}
								aria-pressed={!namesCollapsed}
								onClick={() => setNamesCollapsed(collapsed => !collapsed)}
							>
								<span aria-hidden="true">{namesCollapsed ? '›' : '‹'}</span>
							</button>
						) : null}
						<DayPilotScheduler
							key={`${colorScheme}-${schedulerMountKey}-${tempLoggedInID}`}
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
			</section>

			<div className="scheme-toggle-panel">
				<div className="scheme-toggle-bar">
					<p className="scheme-toggle-label">Color scheme (temporary)</p>
					<Button
						type="button"
						variant="outline"
						size="xs"
						onClick={() => setColorSchemeOpen(open => !open)}
						aria-expanded={colorSchemeOpen}
						aria-controls="scheduler-color-scheme-options"
					>
						{colorSchemeOpen ? (
							<>
								Hide
								<ChevronUp aria-hidden />
							</>
						) : (
							<>
								Show
								<ChevronDown aria-hidden />
							</>
						)}
					</Button>
				</div>
				{colorSchemeOpen && visibleColorSchemeIds.length > 0 ? (
					<div
						id="scheduler-color-scheme-options"
						className="scheme-toggle"
						role="group"
						aria-label="Temporary color scheme"
					>
						{visibleColorSchemeIds.map(id => {
							const scheme = COLOR_SCHEMES[id];
							const pressed = id === colorScheme;
							return (
								<div
									key={id}
									className={cn(
										'scheme-toggle-option',
										pressed && 'scheme-toggle-option-selected'
									)}
								>
									<button
										type="button"
										className="scheme-toggle-remove"
										aria-label={`Remove ${scheme.label}`}
										onClick={() => hideColorScheme(id)}
									>
										×
									</button>
									<button
										type="button"
										className="scheme-toggle-select"
										title={scheme.blurb}
										aria-pressed={pressed}
										onClick={() => setColorScheme(id)}
									>
										<span className="scheme-toggle-option-name">
											{scheme.label}
										</span>
										<span className="scheme-toggle-option-blurb">
											{scheme.blurb}
										</span>
										<span
											className="scheme-toggle-swatches"
											aria-hidden
										>
											<span
												className="scheme-toggle-swatch"
												style={{ background: scheme.headerBg }}
											/>
											<span
												className="scheme-toggle-swatch"
												style={{ background: scheme.eventBar }}
											/>
											<span
												className="scheme-toggle-swatch"
												style={{ background: scheme.eventBgBottom }}
											/>
										</span>
									</button>
								</div>
							);
						})}
					</div>
				) : null}
			</div>

			<div className="mt-[200px] ml-4 flex flex-wrap items-end gap-4">
				<div className="flex min-w-52 flex-col gap-1">
					<Label htmlFor="scheduler-mock-login">Log in as (test)</Label>
					<select
						id="scheduler-mock-login"
						value={tempLoggedInID}
						onChange={event => switchLoginUser(event.target.value)}
						className="h-10 min-w-52 rounded-lg border border-dashed border-[var(--scheme-border)] bg-background px-3 text-sm text-muted-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						{loginOptions.map(resource => (
							<option
								key={String(resource.id)}
								value={String(resource.id)}
							>
								{resource.name}
							</option>
						))}
					</select>
				</div>
				<Label
					htmlFor="scheduler-admin-toggle"
					title="Testing only — switch permission role"
					className="w-fit cursor-pointer rounded-lg border border-dashed border-[var(--scheme-border)] px-3 py-2 text-muted-foreground"
				>
					<input
						id="scheduler-admin-toggle"
						type="checkbox"
						checked={tempIsAdmin}
						onChange={event => {
							const isAdmin = event.target.checked;
							setTempIsAdmin(isAdmin);
							if (isAdmin) {
								setAvailabilityOpen(false);
								setAvailabilityFocusId(null);
							}
						}}
						className="size-3.5 accent-[var(--scheme-primary)]"
					/>
					<span>{tempIsAdmin ? 'Admin role' : 'Regular user'} (test)</span>
				</Label>
			</div>
		</div>
	);
};

export default Scheduler;
