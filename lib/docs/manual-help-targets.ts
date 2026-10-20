export type ManualKind = 'member' | 'admin';

export type ManualHelpTarget = {
	manual: ManualKind;
	/** Top-level accordion section slug, e.g. `map` or `posts`. */
	section?: string;
	/** Nested howto accordion value, e.g. `recommendations--how-to-add-a-recommendation`. */
	item?: string;
};

const MAP_CATEGORY_PATHS = new Set([
	'/food-dining',
	'/services-maintenance',
	'/health-wellness',
	'/shop-market'
]);

function normalizePathname(pathname: string) {
	if (pathname.length > 1 && pathname.endsWith('/')) {
		return pathname.slice(0, -1);
	}
	return pathname || '/';
}

/**
 * Read Tina admin hash when this page is framed by `/admin` (visual preview iframe).
 * Same-origin with the Tina SPA so `parent.location` is readable.
 */
export function getTinaAdminHash(): string | undefined {
	if (typeof window === 'undefined') return undefined;
	try {
		if (window.parent === window) return undefined;
		const parentPath = window.parent.location.pathname;
		if (!parentPath.startsWith('/admin')) return undefined;
		return window.parent.location.hash || undefined;
	} catch {
		return undefined;
	}
}

/**
 * Map the current app route (and optional Tina hash) to which manual + accordion
 * panel the Help sheet should open.
 */
export function resolveManualHelpTarget({
	pathname,
	tinaHash
}: {
	pathname: string;
	tinaHash?: string;
}): ManualHelpTarget {
	const path = normalizePathname(pathname);

	if (tinaHash !== undefined) {
		const hash = tinaHash.toLowerCase();
		if (hash.includes('blog')) {
			return { manual: 'admin', section: 'posts' };
		}
		return { manual: 'admin', section: 'website-content' };
	}

	if (path === '/place') {
		return { manual: 'member' };
	}

	if (MAP_CATEGORY_PATHS.has(path)) {
		return { manual: 'member', section: 'map' };
	}

	if (path === '/community-calendar') {
		return { manual: 'member', section: 'calendar' };
	}

	if (path === '/members/admin/listings/new') {
		return {
			manual: 'admin',
			section: 'recommendations',
			item: 'recommendations--how-to-add-a-recommendation'
		};
	}

	if (
		path === '/members/admin/listings' ||
		path.startsWith('/members/admin/listings/')
	) {
		return {
			manual: 'admin',
			section: 'recommendations',
			item: 'recommendations--how-to-delete-a-recommendation'
		};
	}

	if (path === '/members/admin/invitations') {
		return {
			manual: 'admin',
			section: 'members',
			item: 'members--how-to-add-a-new-member'
		};
	}

	if (path === '/members/admin/users') {
		return { manual: 'admin', section: 'members' };
	}

	if (path === '/members/admin' || path.startsWith('/members/admin/')) {
		return { manual: 'admin' };
	}

	return { manual: 'member' };
}
