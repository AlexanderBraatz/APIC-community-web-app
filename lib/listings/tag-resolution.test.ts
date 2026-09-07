import { describe, expect, it } from 'vitest';
import { parseTags } from '@/lib/listings/types';
import {
	buildAliasMap,
	canonicalsForAliasQuery,
	dedupeAliases,
	mergeAliasArrays,
	normalizeLabel,
	resolveTagInputs,
	tagKey
} from '@/lib/listings/tag-resolution';

const vocab = [
	{ id: '1', name: 'dentist', aliases: ['dental clinic', 'dentista'] },
	{ id: '2', name: 'wine', aliases: ['vino', 'enoteca'] },
	{ id: '3', name: 'italian', aliases: ['italien'] },
	{ id: '4', name: 'italien', aliases: ['italian food'] }
];

describe('normalizeLabel / tagKey', () => {
	it('trims and collapses whitespace', () => {
		expect(normalizeLabel('  dental   clinic ')).toBe('dental clinic');
		expect(tagKey('  Dental Clinic ')).toBe('dental clinic');
	});
});

describe('parseTags', () => {
	it('dedupes case-insensitively', () => {
		expect(parseTags('Wine, wine, VINO')).toEqual(['Wine', 'VINO']);
	});
});

describe('resolveTagInputs', () => {
	it('prefers canonical name over alias', () => {
		const result = resolveTagInputs(['dentist'], vocab);
		expect(result).toEqual([
			{ status: 'matched', raw: 'dentist', tag: vocab[0] }
		]);
	});

	it('resolves via alias', () => {
		const result = resolveTagInputs(['dentista'], vocab);
		expect(result[0]).toMatchObject({
			status: 'matched',
			tag: { name: 'dentist' }
		});
	});

	it('name match wins when alias equals another canonical', () => {
		const result = resolveTagInputs(['italien'], vocab);
		expect(result[0]).toMatchObject({
			status: 'matched',
			tag: { name: 'italien' }
		});
	});

	it('ambiguous alias picks first by name order', () => {
		const shared = [
			{ id: 'a', name: 'beta', aliases: ['shared'] },
			{ id: 'b', name: 'alpha', aliases: ['shared'] }
		];
		const result = resolveTagInputs(['shared'], shared);
		expect(result[0]).toMatchObject({
			status: 'matched',
			tag: { name: 'alpha' }
		});
	});

	it('returns unresolved for unknown labels', () => {
		const result = resolveTagInputs(['brand-new-tag'], vocab);
		expect(result[0]).toMatchObject({
			status: 'unresolved',
			normalized: 'brand-new-tag'
		});
	});

	it('dedupes matched canonicals before assign', () => {
		const result = resolveTagInputs(['dentist', 'dentista'], vocab);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ status: 'matched', tag: { id: '1' } });
	});
});

describe('alias helpers', () => {
	it('dedupes aliases case-insensitively', () => {
		expect(dedupeAliases(['Vino', 'vino', '  ', 'ENOTECA'])).toEqual([
			'Vino',
			'ENOTECA'
		]);
	});

	it('merge drops aliases equal to canonical', () => {
		expect(mergeAliasArrays(['vino'], ['Wine', 'wine'], 'wine')).toEqual([
			'vino'
		]);
	});

	it('buildAliasMap can map one alias to multiple canonicals', () => {
		const map = buildAliasMap([
			{ name: 'italian', aliases: ['italien'] },
			{ name: 'italien', aliases: ['italien'] }
		]);
		expect(canonicalsForAliasQuery('italien', map).sort()).toEqual([
			'italian',
			'italien'
		]);
	});
});
