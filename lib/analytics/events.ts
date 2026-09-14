/** Canonical PostHog event names for APIC product analytics. */
export const AnalyticsEvents = {
	PAGE_VIEW: 'page_view',
	LOGIN_SUCCESS: 'login_success',
	INVITE_ACCEPTED: 'invite_accepted',
	CALENDAR_VIEWED: 'calendar_viewed',
	STAY_CREATED: 'stay_created',
	STAY_EDITED: 'stay_edited',
	DIRECTORY_SEARCHED: 'directory_searched',
	DIRECTORY_FILTER_USED: 'directory_filter_used',
	PLACE_OPENED: 'place_opened',
	MAP_OPENED: 'map_opened',
	CONTACT_CLICKED: 'contact_clicked',
	EVENT_OPENED: 'event_opened',
	GALLERY_OPENED: 'gallery_opened'
} as const;

export type AnalyticsEventName =
	(typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
