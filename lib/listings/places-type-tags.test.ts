import { describe, expect, it } from 'vitest';
import { mapPlacesTypesToTagNames } from '@/lib/listings/places-type-tags';

describe('mapPlacesTypesToTagNames', () => {
	it('maps useful types and ignores noise', () => {
		expect(
			mapPlacesTypesToTagNames({
				types: ['restaurant', 'point_of_interest', 'establishment'],
				primaryType: 'restaurant'
			})
		).toEqual(['restaurant']);
	});

	it('maps dental_clinic to dentist', () => {
		expect(
			mapPlacesTypesToTagNames({
				types: ['dental_clinic', 'health'],
				primaryType: 'dental_clinic'
			})
		).toEqual(['dentist']);
	});

	it('skips category-only restatements', () => {
		expect(
			mapPlacesTypesToTagNames({
				types: ['spa'],
				primaryType: 'spa',
				category: 'health-wellness'
			})
		).toEqual([]);
	});

	it('keeps specific tags even inside a category', () => {
		expect(
			mapPlacesTypesToTagNames({
				types: ['cafe'],
				primaryType: 'cafe',
				category: 'food-dining'
			})
		).toEqual(['coffee']);
	});
});
