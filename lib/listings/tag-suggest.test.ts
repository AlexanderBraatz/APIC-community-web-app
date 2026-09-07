import { describe, expect, it } from 'vitest';
import {
	validateAliasBackfillResponse,
	validateTagSuggestResponse
} from '@/lib/listings/tag-suggest';

const vocab = [
	{ id: '1', name: 'dentist', aliases: ['dentista'] },
	{ id: '2', name: 'wine', aliases: [] }
];

describe('validateTagSuggestResponse', () => {
	it('keeps reuse that exist in vocabulary', () => {
		const validated = validateTagSuggestResponse(
			{
				reuse: ['dentist', 'unknown', 'dentist'],
				proposeNew: [{ name: 'gelato', aliases: ['ice cream', 'gelato'] }],
				aliasesForExisting: [{ alias: 'dental', canonical: 'dentist' }]
			},
			vocab,
			[]
		);
		expect(validated.reuse).toEqual(['dentist']);
		expect(validated.proposeNew).toEqual([
			{ name: 'gelato', aliases: ['ice cream'] }
		]);
		expect(validated.pendingAliasMerges.get('dentist')).toContain('dental');
	});

	it('drops proposeNew that collide with vocabulary', () => {
		const validated = validateTagSuggestResponse(
			{
				reuse: [],
				proposeNew: [{ name: 'dentist', aliases: ['doc'] }],
				aliasesForExisting: []
			},
			vocab
		);
		expect(validated.proposeNew).toEqual([]);
	});

	it('AI failure path can fall back to deterministic-only payload', () => {
		const validated = validateTagSuggestResponse(
			{ reuse: ['wine'], proposeNew: [], aliasesForExisting: [] },
			vocab,
			[]
		);
		expect(validated.reuse).toEqual(['wine']);
		expect(validated.proposeNew).toEqual([]);
	});
});

describe('validateAliasBackfillResponse', () => {
	it('only keeps requested canonicals', () => {
		const validated = validateAliasBackfillResponse(
			{
				items: [
					{ canonical: 'dentist', aliases: ['dentista', 'dentist'] },
					{ canonical: 'stranger', aliases: ['x'] }
				]
			},
			['dentist']
		);
		expect(validated.items).toEqual([
			{ canonical: 'dentist', aliases: ['dentista'] }
		]);
	});
});
