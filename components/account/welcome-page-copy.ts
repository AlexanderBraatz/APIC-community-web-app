import type { ManualLanguage } from '@/lib/docs/manual-language';

type WelcomePageCopy = {
	heading: string;
	benefits: string;
	helpHeading: string;
	helpFabHint: string;
	reportProblem: string;
	readUserManual: string;
	continue: string;
};

export const WELCOME_PAGE_COPY: Record<ManualLanguage, WelcomePageCopy> = {
	en: {
		heading: 'Welcome to the new APIC platform',
		benefits:
			'As a member you can explore community recommendations on the map, manage your attendance on the community calendar, and pin members to compare when you will be at Castelfalfi together.',
		helpHeading: 'Need help understanding the platform?',
		helpFabHint: 'Open the handbook anytime via the question mark button',
		reportProblem: 'Report a problem',
		readUserManual: 'Read user manual',
		continue: 'Continue to members hub'
	},
	de: {
		heading: 'Willkommen auf der neuen APIC-Plattform',
		benefits:
			'Als Mitglied können Sie Community-Empfehlungen auf der Karte entdecken, Ihre Anwesenheit im Community-Kalender verwalten und Mitglieder anheften, um zu vergleichen, wann Sie gemeinsam auf Castelfalfi sind.',
		helpHeading: 'Hilfe zum Verständnis der Plattform?',
		helpFabHint:
			'Öffnen Sie das Handbuch jederzeit über den Fragezeichen-Button',
		reportProblem: 'Problem melden',
		readUserManual: 'Benutzerhandbuch lesen',
		continue: 'Weiter zum Mitgliederbereich'
	},
	it: {
		heading: 'Benvenuto sulla nuova piattaforma APIC',
		benefits:
			'Come membro puoi esplorare le raccomandazioni della community sulla mappa, gestire la tua presenza sul calendario della community e fissare i membri per confrontare quando sarete insieme a Castel Falfi.',
		helpHeading: 'Serve aiuto per capire la piattaforma?',
		helpFabHint:
			'Apri il manuale in qualsiasi momento tramite il pulsante con il punto di domanda',
		reportProblem: 'Segnala un problema',
		readUserManual: 'Leggi il manuale utente',
		continue: 'Continua all’area membri'
	}
};
