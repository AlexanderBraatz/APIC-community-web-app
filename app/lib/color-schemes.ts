export type ColorScheme = {
	label: string;
	blurb: string;
	pageBg: string;
	primary: string;
	primaryHover: string;
	well: string;
	border: string;
	headerBg: string;
	headerFg: string;
	cellBg: string;
	cellBusiness: string;
	gridLine: string;
	eventBar: string;
	eventBarBg: string;
	eventBgTop: string;
	eventBgBottom: string;
	eventBgTopHover: string;
	eventBgBottomHover: string;
	eventBorder: string;
	eventColor: string;
	cellLoggedInBiz: string;
	cellLoggedInWeekend: string;
	cellSelectedBiz: string;
	cellSelectedWeekend: string;
	rowSelected: string;
	rowLoggedIn: string;
};

/** Fixed Sandstone (flat) palette — solid event fill. */
export const SCHEDULER_SCHEME: ColorScheme = {
	label: 'Sandstone (flat)',
	blurb: 'Limestone walls, antique bronze stays · solid event fill',
	pageBg: '#f0ebe3',
	primary: '#6e5b45',
	primaryHover: '#5a4a37',
	well: '#a89880',
	border: '#d0c4b4',
	headerBg: '#e4dbcf',
	headerFg: '#45392d',
	cellBg: '#f8f5f0',
	cellBusiness: '#f2ede5',
	gridLine: '#dfd5c8',
	eventBar: '#a67c2d',
	eventBarBg: '#e8d5a3',
	eventBgTop: '#fbf7ee',
	eventBgBottom: '#fbf7ee',
	eventBgTopHover: '#f6edd8',
	eventBgBottomHover: '#f6edd8',
	eventBorder: '#c4a04e',
	eventColor: '#3d3018',
	cellLoggedInBiz: '#f5ecd4',
	cellLoggedInWeekend: '#faf4e4',
	cellSelectedBiz: '#e5ddd0',
	cellSelectedWeekend: '#efe9df',
	rowSelected: '#7d6b52',
	rowLoggedIn: '#b8922e'
};

export function schemeToCssVars(scheme: ColorScheme): Record<string, string> {
	return {
		'--scheme-page-bg': scheme.pageBg,
		'--scheme-primary': scheme.primary,
		'--scheme-primary-hover': scheme.primaryHover,
		'--scheme-well': scheme.well,
		'--scheme-border': scheme.border,
		'--scheme-header-bg': scheme.headerBg,
		'--scheme-header-fg': scheme.headerFg,
		'--scheme-cell-bg': scheme.cellBg,
		'--scheme-cell-business': scheme.cellBusiness,
		'--scheme-grid-line': scheme.gridLine,
		'--scheme-event-bar': scheme.eventBar,
		'--scheme-event-bar-bg': scheme.eventBarBg,
		'--scheme-event-bg-top': scheme.eventBgTop,
		'--scheme-event-bg-bottom': scheme.eventBgBottom,
		'--scheme-event-bg-top-hover': scheme.eventBgTopHover,
		'--scheme-event-bg-bottom-hover': scheme.eventBgBottomHover,
		'--scheme-event-border': scheme.eventBorder,
		'--scheme-event-color': scheme.eventColor,
		'--scheme-row-selected': scheme.rowSelected
	};
}
