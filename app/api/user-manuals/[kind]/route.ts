import { NextResponse } from 'next/server';
import {
	getProfileManualLanguage,
	readManualMarkdown
} from '@/lib/docs/resolve-manual-source';

export async function GET(
	_request: Request,
	context: { params: Promise<{ kind: string }> }
) {
	const { kind } = await context.params;
	if (kind !== 'member' && kind !== 'admin') {
		return NextResponse.json({ error: 'Invalid manual kind' }, { status: 400 });
	}

	const language = await getProfileManualLanguage();
	const markdown = await readManualMarkdown(kind, language);

	return new NextResponse(markdown, {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Cache-Control': 'private, max-age=60',
			'X-Manual-Language': language
		}
	});
}
