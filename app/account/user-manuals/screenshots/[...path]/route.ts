import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

type RouteParams = {
	params: Promise<{ path: string[] }>;
};

const CONTENT_TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg'
};

export async function GET(_request: Request, { params }: RouteParams) {
	const { path: segments } = await params;

	if (!segments?.length) {
		return new NextResponse('Not found', { status: 404 });
	}

	if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
		return new NextResponse('Not found', { status: 404 });
	}

	const relativePath = segments.join('/');
	if (!/^[a-zA-Z0-9._/-]+\.(png|jpg|jpeg)$/.test(relativePath)) {
		return new NextResponse('Not found', { status: 404 });
	}

	const ext = path.extname(relativePath).toLowerCase();
	const contentType = CONTENT_TYPES[ext];
	if (!contentType) {
		return new NextResponse('Not found', { status: 404 });
	}

	const screenshotsRoot = path.join(process.cwd(), 'docs', 'screenshots');
	const filePath = path.resolve(screenshotsRoot, relativePath);
	if (
		filePath !== screenshotsRoot &&
		!filePath.startsWith(screenshotsRoot + path.sep)
	) {
		return new NextResponse('Not found', { status: 404 });
	}

	try {
		const buffer = await readFile(filePath);
		return new NextResponse(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch {
		return new NextResponse('Not found', { status: 404 });
	}
}
