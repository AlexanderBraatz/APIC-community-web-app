export type ManualSubsection = {
	title: string;
	bodyMarkdown: string;
};

export type ManualSection = {
	title: string;
	/** Markdown between the ## heading and the first ### (if any). */
	preambleMarkdown: string;
	items: ManualSubsection[];
};

export type ParsedUserManual = {
	title: string;
	introMarkdown: string;
	sections: ManualSection[];
};

function trimSectionBody(value: string) {
	return value
		.split('\n')
		.filter((line) => line.trim() !== '---')
		.join('\n')
		.trim();
}

function parseSubsections(body: string): {
	preambleMarkdown: string;
	items: ManualSubsection[];
} {
	const lines = body.split('\n');
	const items: ManualSubsection[] = [];
	let preambleLines: string[] = [];
	let currentTitle: string | null = null;
	let currentBody: string[] = [];

	const flush = () => {
		if (currentTitle === null) return;
		items.push({
			title: currentTitle,
			bodyMarkdown: trimSectionBody(currentBody.join('\n'))
		});
		currentTitle = null;
		currentBody = [];
	};

	for (const line of lines) {
		const h3 = /^###\s+(.+)$/.exec(line);
		if (h3) {
			if (currentTitle === null) {
				preambleLines = [...preambleLines];
			}
			flush();
			currentTitle = h3[1].trim();
			continue;
		}
		if (currentTitle === null) {
			preambleLines.push(line);
		} else {
			currentBody.push(line);
		}
	}
	flush();

	return {
		preambleMarkdown: trimSectionBody(preambleLines.join('\n')),
		items
	};
}

/**
 * Parse a user-manual markdown file into a title/intro + ## / ### tree.
 * Skips the "Table of Contents" section (kept in the file for PDF generation).
 */
export function parseUserManual(markdown: string): ParsedUserManual {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');

	let title = '';
	const introLines: string[] = [];
	const sections: ManualSection[] = [];

	let currentSectionTitle: string | null = null;
	let currentSectionBody: string[] = [];
	let pastTitle = false;

	const flushSection = () => {
		if (currentSectionTitle === null) return;
		if (currentSectionTitle.toLowerCase() !== 'table of contents') {
			const { preambleMarkdown, items } = parseSubsections(
				currentSectionBody.join('\n')
			);
			sections.push({
				title: currentSectionTitle,
				preambleMarkdown,
				items
			});
		}
		currentSectionTitle = null;
		currentSectionBody = [];
	};

	for (const line of lines) {
		const h1 = /^#\s+(.+)$/.exec(line);
		if (h1 && !pastTitle) {
			title = h1[1].trim();
			pastTitle = true;
			continue;
		}

		const h2 = /^##\s+(.+)$/.exec(line);
		if (h2) {
			flushSection();
			currentSectionTitle = h2[1].trim();
			pastTitle = true;
			continue;
		}

		if (currentSectionTitle !== null) {
			currentSectionBody.push(line);
		} else if (pastTitle) {
			introLines.push(line);
		}
	}
	flushSection();

	return {
		title,
		introMarkdown: trimSectionBody(introLines.join('\n')),
		sections
	};
}

export function slugifyManualHeading(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/['']/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}
