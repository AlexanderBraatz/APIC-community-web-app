import { readdir } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
	const blogDir = path.join(process.cwd(), 'content/blog');
	let maxId = 0;

	try {
		const files = await readdir(blogDir);
		for (const file of files) {
			const match = file.match(/^(\d+)\.md$/i);
			if (!match) continue;
			maxId = Math.max(maxId, Number.parseInt(match[1], 10));
		}
	} catch {
		// Directory may not exist yet on first post
	}

	return Response.json({ id: maxId + 1 });
}
