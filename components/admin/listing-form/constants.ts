import { CATEGORY_SLUGS, type CategorySlug } from '@/lib/listings-search';

export const LISTING_FORM_STEPS = [
	{ id: 'category', label: 'Category' },
	{ id: 'google', label: 'Find business' },
	{ id: 'google-summary', label: 'Import summary' },
	{ id: 'type-name', label: 'Type & Name' },
	{ id: 'location', label: 'Location' },
	{ id: 'contact', label: 'Contact info' },
	{ id: 'opening-hours', label: 'Opening hours' },
	{ id: 'apic-description', label: 'APIC description' },
	{ id: 'keywords-intro', label: 'Keywords intro' },
	{ id: 'tags', label: 'Keywords' },
	{ id: 'inspect', label: 'Inspect & Accept' }
] as const;

export const STEP_CATEGORY = 0;
export const STEP_GOOGLE = 1;
export const STEP_GOOGLE_SUMMARY = 2;
export const STEP_TYPE_NAME = 3;
export const STEP_LOCATION = 4;
export const STEP_CONTACT = 5;
export const STEP_OPENING_HOURS = 6;
export const STEP_APIC = 7;
export const STEP_KEYWORDS_INTRO = 8;
export const STEP_TAGS = 9;
export const STEP_INSPECT = 10;

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

export { CATEGORY_SLUGS };
