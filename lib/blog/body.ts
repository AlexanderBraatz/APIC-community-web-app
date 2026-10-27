import type { Json } from '@/lib/supabase/database.types';

type TipTapNode = {
	type?: string;
	content?: TipTapNode[];
};

/**
 * True when body is missing, `{}`, or a TipTap doc with no real content
 * (empty / single empty paragraph).
 */
export function isEmptyBlogBody(body: Json | null | undefined): boolean {
	if (body == null) return true;
	if (typeof body !== 'object') return true;
	if (Array.isArray(body)) return body.length === 0;
	const keys = Object.keys(body);
	if (keys.length === 0) return true;
	const doc = body as TipTapNode;
	if (doc.type === 'doc') {
		const content = doc.content;
		if (!content || content.length === 0) return true;
		const onlyEmptyParagraph =
			content.length === 1 &&
			content[0]?.type === 'paragraph' &&
			(!content[0].content || content[0].content.length === 0);
		if (onlyEmptyParagraph) return true;
	}
	return false;
}

export type BlogPublishBlocker = 'featured' | 'body';

/** What must be present before a post can be published. */
export function getBlogPublishBlockers(input: {
	thumbnailPath: string | null | undefined;
	body: Json | null | undefined;
}): BlogPublishBlocker[] {
	const blockers: BlogPublishBlocker[] = [];
	if (!input.thumbnailPath?.trim()) blockers.push('featured');
	if (isEmptyBlogBody(input.body)) blockers.push('body');
	return blockers;
}

export function blogPublishBlockersMessage(
	blockers: BlogPublishBlocker[]
): string {
	if (blockers.length === 0) return '';
	const labels = blockers.map(b =>
		b === 'featured' ? 'a featured image' : 'article body content'
	);
	if (labels.length === 1) return `Add ${labels[0]} before publishing.`;
	return `Add ${labels[0]} and ${labels[1]} before publishing.`;
}
