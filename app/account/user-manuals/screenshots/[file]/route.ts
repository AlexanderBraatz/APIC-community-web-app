import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

type RouteParams = {
	params: Promise<{ file: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
	const { file } = await params;

	if (!/^[a-zA-Z0-9._-]+\.png$/.test(file)) {
		return new NextResponse('Not found', { status: 404 });
	}

	try {
		const filePath = path.join(process.cwd(), 'docs', 'screenshots', file);
		const buffer = await readFile(filePath);
		return new NextResponse(buffer, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch {
		return new NextResponse('Not found', { status: 404 });
	}
}
