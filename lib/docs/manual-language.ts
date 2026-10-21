export const MANUAL_LANGUAGES = ['en', 'de', 'it'] as const;

export type ManualLanguage = (typeof MANUAL_LANGUAGES)[number];

export const MANUAL_LANGUAGE_LABELS: Record<ManualLanguage, string> = {
	en: 'English',
	de: 'Deutsch',
	it: 'Italiano'
};

export const MANUAL_LANGUAGE_DISCLAIMER =
	'This setting currently only affects the user manuals. The rest of the site stays in English for now.';

export function isManualLanguage(
	value: string | null | undefined
): value is ManualLanguage {
	return (
		typeof value === 'string' &&
		(MANUAL_LANGUAGES as readonly string[]).includes(value)
	);
}

export function parseManualLanguage(
	value: string | null | undefined
): ManualLanguage {
	return isManualLanguage(value) ? value : 'en';
}
