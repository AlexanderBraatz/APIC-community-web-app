import type { ManualLanguage } from '@/lib/docs/manual-language';

type InviteLanguageStepCopy = {
	heading: string;
	noticeOfficial: string;
	noticeHelp: string;
	continue: string;
	languageGroupLabel: string;
};

export const INVITE_LANGUAGE_STEP_COPY: Record<
	ManualLanguage,
	InviteLanguageStepCopy
> = {
	en: {
		heading: 'User manual language',
		noticeOfficial: 'The official language of the APIC platform is English.',
		noticeHelp:
			'Help is available in English, German, and Italian. Open the user manual anytime by clicking the question mark button (?) in the bottom right corner.',
		continue: 'Continue',
		languageGroupLabel: 'Language'
	},
	de: {
		heading: 'Sprache des Handbuchs wählen',
		noticeOfficial: 'Die offizielle Sprache der APIC-Plattform ist Englisch.',
		noticeHelp:
			'Hilfe ist auf Englisch, Deutsch und Italienisch verfügbar. Öffnen Sie das Handbuch jederzeit über den Fragezeichen-Button (?) unten rechts.',
		continue: 'Weiter',
		languageGroupLabel: 'Sprache'
	},
	it: {
		heading: 'Scegli la lingua del manuale',
		noticeOfficial: 'La lingua ufficiale della piattaforma APIC è l’inglese.',
		noticeHelp:
			'La guida è disponibile in inglese, tedesco e italiano. Aprila in qualsiasi momento cliccando sul pulsante del punto di domanda (?) in basso a destra.',
		continue: 'Continua',
		languageGroupLabel: 'Lingua'
	}
};
