/**
 * Member browse URL state.
 * `place` is synced today; `q` / `tags` are reserved for a later URL-search pass.
 */
export type BrowseUrlState = {
	place?: string;
	/** Future: free-text search query */
	q?: string;
	/** Future: active keyword chip names */
	tags?: string[];
};

/** In-page anchor above the sticky search bar (`#listings-browse-search`). */
export const BROWSE_SEARCH_HASH = 'listings-browse-search';

export function parseBrowseUrl(params: URLSearchParams): BrowseUrlState {
	const place = params.get('place')?.trim() || undefined;
	return { place };
}

export function browseUrlSearchParams(
	current: URLSearchParams,
	patch: Partial<BrowseUrlState>
): URLSearchParams {
	const next = new URLSearchParams(current.toString());

	if ('place' in patch) {
		if (patch.place?.trim()) next.set('place', patch.place.trim());
		else next.delete('place');
	}

	if ('q' in patch) {
		if (patch.q?.trim()) next.set('q', patch.q.trim());
		else next.delete('q');
	}

	if ('tags' in patch) {
		if (patch.tags && patch.tags.length > 0) {
			next.set('tags', patch.tags.join(','));
		} else {
			next.delete('tags');
		}
	}

	return next;
}

export function browseUrlHref(
	pathname: string,
	params: URLSearchParams,
	hash?: string
): string {
	const search = params.toString();
	const base = search ? `${pathname}?${search}` : pathname;
	return hash ? `${base}#${hash}` : base;
}
