export function normalizeSearchText(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Case-insensitive fuzzy match: each query word must appear as a subsequence in the name. */
export function fuzzyMatch(query: string, name: string) {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) {
		return false;
	}

	const normalizedName = normalizeSearchText(name);
	const words = normalizedQuery.split(' ');

	return words.every(word => {
		if (normalizedName.includes(word)) {
			return true;
		}

		let nameIndex = 0;
		for (const char of word) {
			nameIndex = normalizedName.indexOf(char, nameIndex);
			if (nameIndex === -1) {
				return false;
			}
			nameIndex += 1;
		}
		return true;
	});
}
