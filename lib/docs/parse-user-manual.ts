export type ManualSubsection = {
	id: string;
	title: string;
	bodyMarkdown: string;
};

export type ManualSection = {
	id: string;
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

const HEADING_ID_RE = /^(.+?)\s*\{#([a-z0-9]+(?:-[a-z0-9]+)*)\}\s*$/u;

function trimSectionBody(value: string) {
	return value
		.split('\n')
		.filter((line) => line.trim() !== '---')
		.join('\n')
		.trim();
}

export function slugifyManualHeading(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/['']/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

/** Parse `Title {#stable-id}` → title + id (fallback slugify if no `{#id}`). */
export function parseManualHeading(raw: string): { id: string; title: string } {
	const trimmed = raw.trim();
	const match = HEADING_ID_RE.exec(trimmed);
	if (match) {
		return { title: match[1].trim(), id: match[2] };
	}
	return { title: trimmed, id: slugifyManualHeading(trimmed) };
}

function parseSubsections(body: string): {
	preambleMarkdown: string;
	items: ManualSubsection[];
} {
	const lines = body.split('\n');
	const items: ManualSubsection[] = [];
	let preambleLines: string[] = [];
	let currentTitle: string | null = null;
	let currentId: string | null = null;
	let currentBody: string[] = [];

	const flush = () => {
		if (currentTitle === null || currentId === null) return;
		items.push({
			id: currentId,
			title: currentTitle,
			bodyMarkdown: trimSectionBody(currentBody.join('\n'))
		});
		currentTitle = null;
		currentId = null;
		currentBody = [];
	};

	for (const line of lines) {
		const h3 = /^###\s+(.+)$/.exec(line);
		if (h3) {
			flush();
			const parsed = parseManualHeading(h3[1]);
			currentTitle = parsed.title;
			currentId = parsed.id;
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
 * Prefer stable `{#id}` markers on headings so translations keep Help anchors.
 */
export function parseUserManual(markdown: string): ParsedUserManual {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');

	let title = '';
	const introLines: string[] = [];
	const sections: ManualSection[] = [];

	let currentSectionTitle: string | null = null;
	let currentSectionId: string | null = null;
	let currentSectionBody: string[] = [];
	let pastTitle = false;

	const flushSection = () => {
		if (currentSectionTitle === null || currentSectionId === null) return;
		if (currentSectionId !== 'table-of-contents') {
			const { preambleMarkdown, items } = parseSubsections(
				currentSectionBody.join('\n')
			);
			sections.push({
				id: currentSectionId,
				title: currentSectionTitle,
				preambleMarkdown,
				items
			});
		}
		currentSectionTitle = null;
		currentSectionId = null;
		currentSectionBody = [];
	};

	for (const line of lines) {
		const h1 = /^#\s+(.+)$/.exec(line);
		if (h1 && !pastTitle) {
			title = parseManualHeading(h1[1]).title;
			pastTitle = true;
			continue;
		}

		const h2 = /^##\s+(.+)$/.exec(line);
		if (h2) {
			flushSection();
			const parsed = parseManualHeading(h2[1]);
			currentSectionTitle = parsed.title;
			currentSectionId = parsed.id;
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
