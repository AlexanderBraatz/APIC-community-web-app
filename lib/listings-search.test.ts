import { describe, expect, it } from 'vitest';
import {
	filterListings,
	listingMatchesQuery,
	suggest,
	type Listing
} from '@/lib/listings-search';
import { buildAliasMap } from '@/lib/listings/tag-resolution';

const listings: Listing[] = [
	{
		name: 'Studio Dentistico',
		type: 'Dentist',
		address: null,
		contacts: [],
		notes: null,
		openingHours: null,
		category: 'health-wellness',
		sourceUrl: '',
		tags: ['dentist', 'Pontedera']
	},
	{
		name: 'Cantina',
		type: 'Winery',
		address: null,
		contacts: [],
		notes: null,
		openingHours: null,
		category: 'food-dining',
		sourceUrl: '',
		tags: ['wine', 'winery']
	}
];

const aliasMap = buildAliasMap([
	{ name: 'dentist', aliases: ['dentista', 'dental clinic'] },
	{ name: 'wine', aliases: ['vino'] }
]);

describe('alias-aware browse search', () => {
	it('matches listings via alias query without exposing aliases as chips', () => {
		expect(listingMatchesQuery(listings[0], 'dentista', aliasMap)).toBe(true);
		expect(filterListings(listings, [], 'dentista', aliasMap)).toEqual([
			listings[0]
		]);
	});

	it('suggest returns canonical tags for alias queries', () => {
		const result = suggest('dentista', listings, [], aliasMap);
		expect(result.tags).toContain('dentist');
		expect(result.tags.some(tag => tag.toLowerCase() === 'dentista')).toBe(
			false
		);
	});

	it('ambiguous alias may surface multiple canonical suggestions', () => {
		const map = buildAliasMap([
			{ name: 'italian', aliases: ['italien'] },
			{ name: 'italien', aliases: ['italien'] }
		]);
		const withBoth: Listing[] = [
			{
				...listings[1],
				tags: ['italian']
			},
			{
				...listings[0],
				tags: ['italien']
			}
		];
		const result = suggest('italien', withBoth, [], map);
		expect(result.tags.sort()).toEqual(['italian', 'italien']);
	});
});
