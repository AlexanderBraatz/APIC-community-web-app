import type { StepperStep } from '@/components/admin/listing-form/stepper-nav';
import type { Json } from '@/lib/supabase/database.types';

export const STEP_HEADER = 0;
export const STEP_FEATURED_IMAGE = 1;
export const STEP_LOCATION = 2;
export const STEP_FIND_LOCATION = 3;
export const STEP_VERIFY_LOCATION = 4;
export const STEP_BODY = 5;
export const STEP_PREVIEW = 6;

export const BLOG_FORM_STEPS: StepperStep[] = [
	{ id: 'header', label: 'Header' },
	{ id: 'featured-image', label: 'Featured image' },
	{ id: 'location', label: 'Location' },
	{ id: 'find-location', label: 'Find location' },
	{ id: 'verify-location', label: 'Verify location' },
	{ id: 'body', label: 'Body' },
	{ id: 'preview', label: 'Preview' }
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
