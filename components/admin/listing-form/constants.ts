import { CATEGORY_SLUGS, type CategorySlug } from '@/lib/listings-search';

export const LISTING_FORM_STEPS = [
	{ id: 'category', label: 'Category' },
	{ id: 'google', label: 'Find place' },
	{ id: 'type-name', label: 'Type & Name' },
	{ id: 'location', label: 'Location' },
	{ id: 'contact', label: 'Contact' },
	{ id: 'apic-description', label: 'APIC description' },
	{ id: 'tags', label: 'Tags' },
	{ id: 'inspect', label: 'Inspect & Accept' }
] as const;

export const STEP_CATEGORY = 0;
export const STEP_GOOGLE = 1;
export const STEP_TYPE_NAME = 2;
export const STEP_LOCATION = 3;
export const STEP_CONTACT = 4;
export const STEP_APIC = 5;
export const STEP_TAGS = 6;
export const STEP_INSPECT = 7;

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

export { CATEGORY_SLUGS };

/** Mid-weight action (Add contact / Add hours / Adjust pin) — stronger than outline, softer than Next. */
export const SECONDARY_ACTION_BUTTON_CLASS =
	'rounded-[2px] border border-[#d4a05a] bg-[#f7bc74] text-black hover:bg-[#f0a84f]';

/** Clear / remove action — same weight as secondary, muted reddish. */
export const CLEAR_ACTION_BUTTON_CLASS =
	'rounded-[2px] border border-[#c49286] bg-[#e2b0a4] text-black hover:bg-[#d4a195]';
