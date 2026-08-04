/**
 * Shared extractors for splitting free-text contact/notes into structured listing fields.
 */

/** @typedef {'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'} DayKey */
/** @typedef {{ open: string, close: string }} Period */
/** @typedef {{ status: 'open', periods: Period[] } | { status: 'closed' }} DayEntry */
/** @typedef {{ days: Partial<Record<DayKey, DayEntry>>, note?: string }} OpeningHours */

export const DAY_KEYS = /** @type {const} */ ([
	'mon',
	'tue',
	'wed',
	'thu',
	'fri',
	'sat',
	'sun'
]);

/** @type {Record<string, DayKey>} */
const DAY_ALIASES = {
	mon: 'mon',
	monday: 'mon',
	tue: 'tue',
	tues: 'tue',
	tuesday: 'tue',
	wed: 'wed',
	wednesday: 'wed',
	thu: 'thu',
	thur: 'thu',
	thurs: 'thu',
	thursday: 'thu',
	fri: 'fri',
	friday: 'fri',
	sat: 'sat',
	saturday: 'sat',
	sun: 'sun',
	sunday: 'sun'
};

const DAY_WORD =
	'mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE =
	/(?:https?:\/\/|www\.)[^\s<>"')\],;]+|(?:[a-z0-9-]+\.)+(?:com|it|net|org|eu)(?:\/[^\s<>"')\],;]*)?/gi;

/**
 * @param {string} raw
 * @returns {string | null}
 */
export function normalizeWebsite(raw) {
	let value = raw.trim().replace(/[.,;)\]]+$/g, '');
	if (!value) return null;
	if (!/^https?:\/\//i.test(value)) {
		value = `https://${value.replace(/^\/\//, '')}`;
	}
	try {
		const url = new URL(value);
		if (!url.hostname.includes('.')) return null;
		return url.toString().replace(/\/$/, '');
	} catch {
		return null;
	}
}

/**
 * @param {string} text
 * @returns {{ email: string | null, website: string | null, remainder: string }}
 */
export function extractEmailAndWebsite(text) {
	if (!text) return { email: null, website: null, remainder: '' };

	let remainder = text;
	/** @type {string | null} */
	let email = null;
	/** @type {string | null} */
	let website = null;

	const emails = [...remainder.matchAll(EMAIL_RE)];
	if (emails.length) {
		email = emails[0][0];
		for (const match of emails) {
			remainder = remainder.replace(match[0], ' ');
		}
	}

	const brokenEmail = remainder.match(
		/\b([A-Z0-9._%+-]+)@([A-Z0-9.-]+):([A-Z]{2,})\b/i
	);
	if (brokenEmail && !email) {
		email = `${brokenEmail[1]}@${brokenEmail[2]}.${brokenEmail[3]}`.toLowerCase();
		remainder = remainder.replace(brokenEmail[0], ' ');
	}

	const urls = [...remainder.matchAll(URL_RE)];
	if (urls.length) {
		website = normalizeWebsite(urls[0][0]);
		for (const match of urls) {
			remainder = remainder.replace(match[0], ' ');
		}
	}

	remainder = remainder
		.replace(/\b(e-?mail|mail)\s*:\s*/gi, ' ')
		.replace(/\b(phone|tel(?:ephone)?|mobile|telefono)\s*[.:]?\s*/gi, ' ')
		.replace(/\s*[|/·•]+\s*/g, ' · ')
		.replace(/\s{2,}/g, ' ')
		.replace(/^[\s·|/,:.-]+|[\s·|/,:.-]+$/g, '')
		.trim();

	return { email, website, remainder: remainder || '' };
}

/**
 * @param {string} remainder
 * @returns {string | null}
 */
export function tidyPhone(remainder) {
	if (!remainder) return null;
	let phone = remainder
		.replace(/\b(or|and|\/)\b/gi, ' · ')
		.replace(/\s{2,}/g, ' ')
		.replace(/^[\s·|/,:.-]+|[\s·|/,:.-]+$/g, '')
		.replace(/[–—-]+$/g, '')
		.trim();

	if (!/[\d+]/.test(phone)) return null;
	phone = phone.replace(/\s+/g, ' ').trim();
	if (!phone) return null;
	return phone;
}

/**
 * @param {string} raw
 * @returns {string | null}
 */
function normalizeTime(raw) {
	const spaced = raw.trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
	if (spaced) {
		let hour = Number(spaced[1]);
		const minute = Number(spaced[2]);
		const meridiem = spaced[3]?.toLowerCase();
		if (meridiem === 'pm' && hour < 12) hour += 12;
		if (meridiem === 'am' && hour === 12) hour = 0;
		if (hour > 23 || minute > 59) return null;
		return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
	}

	const compact = raw.trim().toLowerCase().replace(/\./g, ':').replace(/\s+/g, '');
	const ampm = compact.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/i);
	if (ampm) {
		let hour = Number(ampm[1]);
		const minute = ampm[2] ? Number(ampm[2]) : 0;
		const meridiem = ampm[3].toLowerCase();
		if (meridiem === 'pm' && hour < 12) hour += 12;
		if (meridiem === 'am' && hour === 12) hour = 0;
		return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
	}

	const plain = compact.match(/^(\d{1,2}):(\d{2})$/);
	if (!plain) return null;
	const hour = Number(plain[1]);
	const minute = Number(plain[2]);
	if (hour > 23 || minute > 59) return null;
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * @param {string} token
 * @returns {DayKey | null}
 */
function parseDayToken(token) {
	const key = token.toLowerCase().replace(/\./g, '').trim();
	return DAY_ALIASES[key] ?? null;
}

/**
 * @param {string} raw
 * @returns {DayKey[]}
 */
export function expandDays(raw) {
	const cleaned = raw
		.toLowerCase()
		.replace(/&/g, ',')
		.replace(/\band\b/g, ',')
		.replace(/[–—−]/g, '-')
		.replace(/\+/g, ',')
		.trim();

	/** @type {DayKey[]} */
	const days = [];
	const parts = cleaned
		.split(/[,/]+/)
		.map(p => p.trim())
		.filter(Boolean);

	for (const part of parts) {
		const range = part.match(
			new RegExp(`^(${DAY_WORD})\\s*-\\s*(${DAY_WORD})$`, 'i')
		);
		if (range) {
			const start = parseDayToken(range[1]);
			const end = parseDayToken(range[2]);
			if (!start || !end) continue;
			const startIdx = DAY_KEYS.indexOf(start);
			const endIdx = DAY_KEYS.indexOf(end);
			if (startIdx <= endIdx) {
				for (let i = startIdx; i <= endIdx; i++) days.push(DAY_KEYS[i]);
			} else {
				for (let i = startIdx; i < DAY_KEYS.length; i++) days.push(DAY_KEYS[i]);
				for (let i = 0; i <= endIdx; i++) days.push(DAY_KEYS[i]);
			}
			continue;
		}

		const single = parseDayToken(part);
		if (single) days.push(single);
	}

	return [...new Set(days)];
}

/**
 * @param {string} raw
 * @returns {Period[]}
 */
export function parsePeriods(raw) {
	const text = raw
		.replace(/\s*&\s*/g, ' · ')
		.replace(/,/g, ' · ')
		.replace(/\s*[–—]\s*/g, '-')
		.replace(/\s+-\s+/g, '-');

	/** @type {Period[]} */
	const periods = [];
	const re =
		/(\d{1,2}(?:[:.]\d{2})?\s*(?:[ap]m)?)\s*-\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:[ap]m)?)/gi;
	let match;
	while ((match = re.exec(text)) !== null) {
		const open = normalizeTime(match[1]);
		const close = normalizeTime(match[2]);
		if (open && close) periods.push({ open, close });
	}
	return periods;
}

/**
 * @param {Partial<Record<DayKey, DayEntry>>} days
 * @param {DayKey[]} targets
 * @param {DayEntry} entry
 */
function setDays(days, targets, entry) {
	for (const day of targets) {
		days[day] = entry;
	}
}

/**
 * Split hours text into day-scoped segments.
 * @param {string} hoursText
 * @returns {OpeningHours | null}
 */
export function parseOpeningHoursText(hoursText) {
	if (!hoursText?.trim()) return null;

	/** @type {Partial<Record<DayKey, DayEntry>>} */
	const days = {};
	/** @type {string[]} */
	const residual = [];

	let text = hoursText
		.replace(/^opening\s*hours?\s*:?\s*/i, '')
		.replace(/^hours?\s*:?\s*/i, '')
		.replace(/^\*\s*/gm, '')
		.replace(/[–—]/g, '-')
		.trim();

	// Normalize segment separators
	text = text
		.replace(/\s*[·•*]\s*/g, ' | ')
		.replace(/\s*;\s*/g, ' | ')
		.replace(/\.\s*(?=(?:Closed|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))/gi, ' | ')
		.trim();

	const segments = text
		.split(/\s*\|\s*/)
		.map(s => s.trim())
		.filter(Boolean);

	for (let segment of segments) {
		segment = segment.replace(/\.$/, '').trim();

		if (/^closed\b/i.test(segment) || /\bclosed$/i.test(segment)) {
			const dayPart = segment.replace(/^closed\s+/i, '').replace(/\s*closed$/i, '');
			const closedDays = expandDays(dayPart);
			if (closedDays.length) {
				setDays(days, closedDays, { status: 'closed' });
				continue;
			}
		}

		// Prefer sequential pairs when a segment contains multiple day+time groups
		// e.g. "Mon-Sat 08.00-21.00 Sun 08.00-13.30"
		const sequentialRe = new RegExp(
			`((?:${DAY_WORD})(?:\\s*-\\s*(?:${DAY_WORD}))?(?:(?:\\s*[,&+]\\s*|\\s+(?:and|&)\\s+|\\s+)(?:${DAY_WORD}))*)\\s*:?\\s*((?:\\d{1,2}(?:[:.]\\d{2})?\\s*(?:[ap]m)?\\s*-\\s*\\d{1,2}(?:[:.]\\d{2})?\\s*(?:[ap]m)?)(?:\\s*(?:[&,]|[–—-])\\s*\\d{1,2}(?:[:.]\\d{2})?\\s*(?:[ap]m)?\\s*-\\s*\\d{1,2}(?:[:.]\\d{2})?\\s*(?:[ap]m)?)*)`,
			'gi'
		);
		const sequential = [...segment.matchAll(sequentialRe)];
		if (sequential.length >= 1) {
			for (const m of sequential) {
				const dayList = expandDays(m[1]);
				const periods = parsePeriods(m[2]);
				if (dayList.length && periods.length) {
					setDays(days, dayList, { status: 'open', periods });
				}
			}
			let leftover = segment.replace(sequentialRe, ' ').trim();
			// Catch trailing "Sun: Closed" / "Sat+Sun closed"
			const closedTail = leftover.match(
				new RegExp(
					`((?:${DAY_WORD})(?:\\s*[,&+/\\-]\\s*|\\s+(?:and|&)\\s+|\\s+)*(?:${DAY_WORD})?)\\s*:?\\s*closed`,
					'i'
				)
			);
			if (closedTail) {
				const closedDays = expandDays(closedTail[1]);
				if (closedDays.length) setDays(days, closedDays, { status: 'closed' });
				leftover = leftover.replace(closedTail[0], ' ').trim();
			} else if (/\bclosed\b/i.test(leftover)) {
				const closedDays = expandDays(leftover.replace(/\bclosed\b/i, ''));
				if (closedDays.length) setDays(days, closedDays, { status: 'closed' });
				leftover = leftover.replace(/\bclosed\b/gi, ' ').trim();
			}
			leftover = leftover.replace(/\s{2,}/g, ' ').trim();
			if (leftover) residual.push(leftover);
			continue;
		}

		const closedDay = segment.match(
			new RegExp(
				`^((?:${DAY_WORD})(?:\\s*[,&+/\\-]\\s*|\\s+(?:and|&)\\s+|\\s+)*(?:${DAY_WORD})?)\\s*:?\\s*closed$`,
				'i'
			)
		);
		if (closedDay) {
			const closedDays = expandDays(closedDay[1]);
			if (closedDays.length) {
				setDays(days, closedDays, { status: 'closed' });
				continue;
			}
		}

		residual.push(segment);
	}

	if (Object.keys(days).length === 0) {
		return null;
	}

	/** @type {OpeningHours} */
	const result = { days };
	const note = residual.join(' ').replace(/\s{2,}/g, ' ').trim();
	if (note) result.note = note;
	return result;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function looksLikeHoursBlob(text) {
	const compact = text.replace(/\s+/g, ' ').trim();
	if (compact.length > 220) return false;
	if (!/\d{1,2}[:.]\d{2}/.test(compact) && !/\bclosed\b/i.test(compact)) {
		return false;
	}
	const withoutHours = compact
		.replace(new RegExp(DAY_WORD, 'gi'), ' ')
		.replace(/\d{1,2}[:.]\d{2}\s*(?:[ap]m)?/gi, ' ')
		.replace(/\b(?:closed|opening|hours?|am|pm)\b/gi, ' ')
		.replace(/[–—\-:,.&|()*/·•]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return withoutHours.length < 20;
}

/**
 * @param {string | null | undefined} notes
 * @returns {{ notes: string | null, openingHours: OpeningHours | null, websites: string[] }}
 */
export function extractFromNotes(notes) {
	if (!notes?.trim()) {
		return { notes: null, openingHours: null, websites: [] };
	}

	let text = notes.trim();
	/** @type {string[]} */
	const websites = [];

	const urlMatches = [...text.matchAll(URL_RE)];
	for (const match of urlMatches) {
		const normalized = normalizeWebsite(match[0]);
		if (normalized) websites.push(normalized);
		text = text.replace(match[0], ' ');
	}
	text = text.replace(/\s{2,}/g, ' ').trim();

	/** @type {string | null} */
	let hoursRaw = null;

	const labeled = text.match(/\bopening\s*hours?\s*:?\s*/i);
	if (labeled && labeled.index != null) {
		const start = labeled.index;
		const labelEnd = start + labeled[0].length;
		const before = text.slice(0, start).trim();
		const after = text.slice(labelEnd).trim();

		// Prefer cutting before a long prose sentence
		// Cut before descriptive prose (allow Capitalized place/business names).
		const proseCut = after.search(
			/(?<=[.!?])\s+(?=[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){2,})/
		);
		// Also cut before unpunctuated prose after a closed/time token:
		// "…20:00 Medication requests…" / "…closed A wonderful coffee…"
		const softCut = after.search(
			/(?<=\d{2}|\bclosed|\bpm|\bam)\s+(?=[A-Z][a-z]{3,}\s+[a-z])/i
		);
		const cutAt =
			proseCut >= 0 ? proseCut : softCut >= 0 ? softCut : -1;
		if (cutAt >= 0) {
			const candidate = after.slice(0, cutAt).trim();
			const rest = after.slice(cutAt).trim();
			hoursRaw = candidate;
			text = [before, rest].filter(Boolean).join(' ').trim();
		} else if (looksLikeHoursBlob(after)) {
			hoursRaw = after;
			text = before;
		} else {
			// Hours labeled mid/end of long note — take from hours through end if short enough
			const tailHours = after.match(
				/^([\s\S]{0,200}?\d{1,2}[:.]\d{2}[\s\S]{0,80}?(?:closed)?)\s*(.*)$/i
			);
			if (tailHours && looksLikeHoursBlob(tailHours[1])) {
				hoursRaw = tailHours[1].trim();
				text = [before, tailHours[2].trim()].filter(Boolean).join(' ').trim();
			} else {
				hoursRaw = after;
				text = before;
			}
		}
	} else {
		// Informal leading hours, or trailing "Hours Mon–Sat..."
		const trailingHours = text.match(
			/\bHours\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s\S]{5,160})$/i
		);
		if (trailingHours) {
			hoursRaw = trailingHours[1].trim();
			text = text.slice(0, trailingHours.index).trim();
		} else {
			// "Mon-Fri … Sat+Sun closed Descriptive prose…"
			const leading = text.match(
				/^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s\S]{5,160}?\bclosed\.?)\s+([A-Z].+)$/i
			);
			if (leading && (parsePeriods(leading[1]).length || /\bclosed\b/i.test(leading[1]))) {
				hoursRaw = leading[1].trim();
				text = leading[2].trim();
			} else if (looksLikeHoursBlob(text)) {
				hoursRaw = text;
				text = '';
			} else {
				const onlyHours = text.match(
					/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s\S]{5,120}$/i
				);
				if (onlyHours && parsePeriods(text).length) {
					hoursRaw = text;
					text = '';
				}
			}
		}
	}

	const openingHours = hoursRaw ? parseOpeningHoursText(hoursRaw) : null;

	text = text
		.replace(/\s{2,}/g, ' ')
		.replace(/^[\s·|/,:.-]+|[\s·|/,:.-]+$/g, '')
		.trim();

	return {
		notes: text || null,
		openingHours,
		websites: [...new Set(websites)]
	};
}

/**
 * @param {{ contact?: string | null, notes?: string | null, remark?: string | null }} row
 */
export function extractListingFields(row) {
	const contact = row.contact ?? '';
	const rawNotes = row.notes ?? row.remark ?? '';

	const fromContact = extractEmailAndWebsite(contact);
	const fromNotes = extractFromNotes(rawNotes);

	return {
		phone: tidyPhone(fromContact.remainder),
		email: fromContact.email,
		website: fromContact.website || fromNotes.websites[0] || null,
		notes: fromNotes.notes,
		opening_hours: fromNotes.openingHours
	};
}
