import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const MANUAL_FILES = {
	member: 'USER_MANUAL_MEMBER.md',
	admin: 'USER_MANUAL_ADMIN.md'
} as const;

type ManualKind = keyof typeof MANUAL_FILES;

export async function GET(
	_request: Request,
	context: { params: Promise<{ kind: string }> }
) {
	const { kind } = await context.params;
	if (kind !== 'member' && kind !== 'admin') {
		return NextResponse.json({ error: 'Invalid manual kind' }, { status: 400 });
	}

	const fileName = MANUAL_FILES[kind as ManualKind];
	const markdown = await readFile(
		path.join(process.cwd(), 'docs', fileName),
		'utf8'
	);

	return new NextResponse(markdown, {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Cache-Control': 'private, max-age=60'
		}
	});
}
