/** sessionStorage key: hide help FAB coach mark until next login. */
export const HELP_FAB_HINT_DISMISSED_KEY = 'help-fab-hint-dismissed';

/** Same-tab signal when login clears the dismiss flag (sessionStorage has no storage event). */
export const HELP_FAB_HINT_CLEARED_EVENT = 'help-fab-hint-cleared';

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
	if (typeof sessionStorage === 'undefined') return false;
	return sessionStorage.getItem(HELP_FAB_HINT_DISMISSED_KEY) === '1';
}

export function dismissHelpFabHint(): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(HELP_FAB_HINT_DISMISSED_KEY, '1');
}

/** Call on successful login / invite finish so the coach mark can show again. */
export function clearHelpFabHintDismissed(): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.removeItem(HELP_FAB_HINT_DISMISSED_KEY);
	window.dispatchEvent(new Event(HELP_FAB_HINT_CLEARED_EVENT));
}
