import type { StepperStep } from '@/components/admin/listing-form/stepper-nav';
import type { Json } from '@/lib/supabase/database.types';

export const STEP_HEADER = 0;
export const STEP_LOCATION = 1;
export const STEP_BODY = 2;
export const STEP_PREVIEW = 3;

export const BLOG_FORM_STEPS: StepperStep[] = [
	{ id: 'header', label: 'Header' },
	{ id: 'location', label: 'Location' },
	{ id: 'body', label: 'Body' },
	{ id: 'preview', label: 'Preview' }
];

/** Nested find → pin flow inside the Location step (matches map modal). */
export const LOCATION_SUB_FIND = 0;
export const LOCATION_SUB_DETAILS = 1;

export const LOCATION_SUB_STEPS: StepperStep[] = [
	{ id: 'find', label: 'Find place' },
	{ id: 'details', label: 'Pin & address' }
];

export const AUTOSAVE_DEBOUNCE_MS = 800;

/** Empty TipTap doc used when a draft has no body yet. */
export const EMPTY_BLOG_BODY: Json = {
	type: 'doc',
	content: [{ type: 'paragraph' }]
};

export function normalizeBlogBody(body: Json | null | undefined): Json {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return EMPTY_BLOG_BODY;
	}
	const keys = Object.keys(body);
	if (keys.length === 0) return EMPTY_BLOG_BODY;
	const doc = body as { type?: string; content?: unknown[] };
	if (doc.type !== 'doc') return EMPTY_BLOG_BODY;
	return body;
}
