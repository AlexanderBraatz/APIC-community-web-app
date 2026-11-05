import { NextResponse } from 'next/server';
import { BLOG_IMAGES_BUCKET } from '@/lib/blog/thumbnail';
import { createClient } from '@/lib/supabase/server';

const IMAGE_CONTENT_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif'
};

function contentTypeFor(objectPath: string, blobType: string): string {
	if (blobType.startsWith('image/')) return blobType;
	const extension = objectPath.split('.').pop()?.toLowerCase() ?? '';
	return IMAGE_CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

function isSafeSegment(segment: string): boolean {
	if (!segment || segment === '.' || segment === '..') return false;
	if (segment.includes('/') || segment.includes('\\') || segment.includes('\0')) {
		return false;
	}
	if (segment.includes('%')) return false;
	return true;
}

export async function GET(
	_request: Request,
	context: { params: Promise<{ path: string[] }> }
) {
	const { path: segments } = await context.params;
	if (!segments?.length || segments.some(segment => !isSafeSegment(segment))) {
		return new NextResponse(null, { status: 400 });
	}

	const objectPath = segments.join('/');
	if (objectPath.length > 1000) {
		return new NextResponse(null, { status: 400 });
	}

	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) {
		return new NextResponse(null, { status: 401 });
	}

	const { data, error } = await supabase.storage
		.from(BLOG_IMAGES_BUCKET)
		.download(objectPath);

	if (error || !data || data.size === 0) {
		return new NextResponse(null, { status: 404 });
	}

	return new NextResponse(await data.arrayBuffer(), {
		headers: {
			'Content-Type': contentTypeFor(objectPath, data.type),
			'Cache-Control': 'private',
			'X-Content-Type-Options': 'nosniff'
		}
	});
}
