const BASE_SCHEME_IDS = [
	'soft-clay',
	'classic-brown',
	'linen-suite',
	'sandstone',
	'cedar-wing'
] as const;

export type BaseColorSchemeId = (typeof BASE_SCHEME_IDS)[number];

export type ColorSchemeId =
	| BaseColorSchemeId
	| `${BaseColorSchemeId}-flat`;

const FLAT_EXCLUDED: BaseColorSchemeId[] = ['classic-brown'];

export const COLOR_SCHEME_IDS = BASE_SCHEME_IDS.flatMap(id =>
	FLAT_EXCLUDED.includes(id) ? [id] : [id, `${id}-flat` as const]
) as ColorSchemeId[];

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

/** Quiet warm chrome, refined gold stays — grand-hotel palette. */
const BASE_COLOR_SCHEMES: Record<BaseColorSchemeId, ColorScheme> = {
	'soft-clay': {
		label: 'Soft clay',
		blurb: 'Warm paper, muted headers, gold stays',
		pageBg: '#f3eee6',
		primary: '#7a6548',
		primaryHover: '#65533a',
		well: '#b9ab98',
		border: '#c8c0b4',
		headerBg: '#e7e0d4',
		headerFg: '#4a4338',
		cellBg: '#faf8f4',
		cellBusiness: '#f5f1ea',
		gridLine: '#e4ddd2',
		eventBar: '#c9920a',
		eventBarBg: '#f3e7a8',
		eventBgTop: '#fffdf5',
		eventBgBottom: '#ffe9a3',
		eventBgTopHover: '#fff8e1',
		eventBgBottomHover: '#ffdf7a',
		eventBorder: '#e0c45c',
		eventColor: '#3b2f0a',
		cellLoggedInBiz: '#fef6d9',
		cellLoggedInWeekend: '#fffbec',
		cellSelectedBiz: '#ebe6dc',
		cellSelectedWeekend: '#f3efe6',
		rowSelected: '#8a7a5c',
		rowLoggedIn: '#c9a227'
	},
	'classic-brown': {
		label: 'Classic brown',
		blurb: 'Original castel header and cream grid',
		pageBg: '#f7f5f0',
		primary: '#6b512b',
		primaryHover: '#5a4324',
		well: '#6b512b',
		border: '#968a80',
		headerBg: '#6b512b',
		headerFg: '#ffffff',
		cellBg: '#f9f9f9',
		cellBusiness: '#f7f5f0',
		gridLine: '#e3e1d3',
		eventBar: '#e3ac20',
		eventBarBg: '#e8e49e',
		eventBgTop: '#ffffff',
		eventBgBottom: '#fafafa',
		eventBgTopHover: '#fdfdfd',
		eventBgBottomHover: '#f3f3f3',
		eventBorder: '#cccccc',
		eventColor: '#333333',
		cellLoggedInBiz: '#fef6d9',
		cellLoggedInWeekend: '#fffbec',
		cellSelectedBiz: '#e5f2e9',
		cellSelectedWeekend: '#f3faf6',
		rowSelected: '#3d8b5a',
		rowLoggedIn: '#c9a227'
	},
	'linen-suite': {
		label: 'Linen suite',
		blurb: 'Pale linen, whisper-gold stays',
		pageBg: '#faf7f2',
		primary: '#8a7a64',
		primaryHover: '#726452',
		well: '#d2c6b4',
		border: '#e4dcd0',
		headerBg: '#f2ebe2',
		headerFg: '#5a5146',
		cellBg: '#fffcf8',
		cellBusiness: '#faf6f0',
		gridLine: '#ebe4da',
		eventBar: '#c9a84a',
		eventBarBg: '#f4eac8',
		eventBgTop: '#fffefb',
		eventBgBottom: '#f7edc8',
		eventBgTopHover: '#fbf6e4',
		eventBgBottomHover: '#f0e2a8',
		eventBorder: '#dbc67a',
		eventColor: '#4a4030',
		cellLoggedInBiz: '#faf4e6',
		cellLoggedInWeekend: '#fdf9f0',
		cellSelectedBiz: '#eee8de',
		cellSelectedWeekend: '#f6f1e9',
		rowSelected: '#9a8b74',
		rowLoggedIn: '#c9b06a'
	},
	sandstone: {
		label: 'Sandstone',
		blurb: 'Limestone walls, antique bronze stays',
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
		eventBgBottom: '#ecd9a8',
		eventBgTopHover: '#f6edd8',
		eventBgBottomHover: '#e0c888',
		eventBorder: '#c4a04e',
		eventColor: '#3d3018',
		cellLoggedInBiz: '#f5ecd4',
		cellLoggedInWeekend: '#faf4e4',
		cellSelectedBiz: '#e5ddd0',
		cellSelectedWeekend: '#efe9df',
		rowSelected: '#7d6b52',
		rowLoggedIn: '#b8922e'
	},
	'cedar-wing': {
		label: 'Cedar wing',
		blurb: 'Rust-brown header, warm stone, amber stays',
		pageBg: '#f2ebe3',
		primary: '#7a4334',
		primaryHover: '#653628',
		well: '#9a6450',
		border: '#d4c5b5',
		headerBg: '#6e3b2e',
		headerFg: '#f5ebe3',
		cellBg: '#faf6f1',
		cellBusiness: '#f3ece4',
		gridLine: '#e2d6c8',
		eventBar: '#b8841f',
		eventBarBg: '#edd9a0',
		eventBgTop: '#fffaf0',
		eventBgBottom: '#f0dba0',
		eventBgTopHover: '#f8efd8',
		eventBgBottomHover: '#e6cb7e',
		eventBorder: '#d4b05a',
		eventColor: '#3d3014',
		cellLoggedInBiz: '#faf0d8',
		cellLoggedInWeekend: '#fdf6e8',
		cellSelectedBiz: '#e8ddd2',
		cellSelectedWeekend: '#f0e7dd',
		rowSelected: '#8f6a58',
		rowLoggedIn: '#c4a035'
	}
};

function withFlatEvents(scheme: ColorScheme): ColorScheme {
	return {
		...scheme,
		label: `${scheme.label} (flat)`,
		blurb: `${scheme.blurb} · solid event fill`,
		eventBgBottom: scheme.eventBgTop,
		eventBgBottomHover: scheme.eventBgTopHover
	};
}

function buildColorSchemes(): Record<ColorSchemeId, ColorScheme> {
	const schemes = {} as Record<ColorSchemeId, ColorScheme>;

	for (const id of BASE_SCHEME_IDS) {
		const base = BASE_COLOR_SCHEMES[id];
		schemes[id] = base;
		if (!FLAT_EXCLUDED.includes(id)) {
			schemes[`${id}-flat`] = withFlatEvents(base);
		}
	}

	return schemes;
}

export const COLOR_SCHEMES = buildColorSchemes();

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
		'--scheme-event-color': scheme.eventColor
	};
}
