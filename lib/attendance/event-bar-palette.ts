export const EVENT_BAR_PALETTE = [
	'#c9920a',
	'#3d8b5a',
	'#2f6f9e',
	'#b85c38',
	'#6b512b',
	'#7a4e8a',
	'#4a7c59',
	'#c45c6a',
	'#1f8a7a',
	'#8a5a12'
] as const;

export type EventBarColor = (typeof EVENT_BAR_PALETTE)[number];
