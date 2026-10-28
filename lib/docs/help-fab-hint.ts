/** localStorage key: hide help FAB coach mark permanently after dismiss/open. */
export const HELP_FAB_HINT_DISMISSED_KEY = 'help-fab-hint-dismissed';

const HINT_ROUTES = new Set([
	'/food-dining',
	'/services-maintenance',
	'/health-wellness',
	'/shop-market',
	'/community-calendar'
]);

export function isHelpFabHintRoute(pathname: string): boolean {
	return HINT_ROUTES.has(pathname);
}

export function isHelpFabHintDismissed(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(HELP_FAB_HINT_DISMISSED_KEY) === '1';
}

export function dismissHelpFabHint(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(HELP_FAB_HINT_DISMISSED_KEY, '1');
}
