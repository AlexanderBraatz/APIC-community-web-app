/**
 * Stage 7: migrate content/blog/1.md → blog_posts + blog-images + redirect + map remap.
 *
 * Idempotent by slug. Safe to re-run (re-uploads images with upsert; refreshes body).
 *
 * Usage (repo root):
 *   node --env-file=.env.local scripts/migrate-golf-blog-post.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const TITLE = 'Castelfalfi Owners & Friends Golf Tournament';
const AUTHOR = 'APIC';
const PUBLISHED_AT = '2026-07-11T12:00:00.000Z';
const SHORT_DESCRIPTION =
	'Around 40 participants joined our friendly nine-hole competition at Bellosguardo Golf Club — a memorable day of golf, friendship, and community.';

const PARAGRAPHS = [
	'Around 40 participants joined our Castelfalfi Owners & Friends Golf Tournament at Bellosguardo Golf Club for a friendly nine-hole competition. It was a wonderful day of golf, friendship, and great company, followed by a relaxed lunch enjoyed together by many of the participants.',
	"Congratulations to Ulla and Thomas Schmidt, who were the best-performing Castelfalfi team and won this year's Owners Cup with an excellent round of one stroke over par.",
	'We were delighted to welcome members from Castelfalfi, Bellosguardo Golf Club, and the former Castelfalfi Golf Club, making the event a true celebration of our golfing community. Thank you to everyone who took part and helped make the day such a memorable success. We are already looking forward to welcoming even more participants next year!'
];

/** Local gallery paths relative to public/ (order from content/blog/1.md). */
const GALLERY_FILES = [
	'images/blog/1/5bf74eca-ca57-48b6-883e-3955223a2e62-1.jpeg',
	'images/blog/1/33ff5ff2-8db7-4ed4-8e3e-826f1ccd9734.jpeg',
	'images/blog/1/dbd198c5-b24b-42f8-9ce4-1987a5a5eef6.jpeg',
	'images/blog/1/IMG_3224.jpeg',
	'images/blog/1/96D1B641-1AC1-4138-8C38-A73CA392B517.png',
	'images/blog/1/028B8486-AA3C-468D-ABB5-04B79F69BDFB.png'
];

const BUCKET = 'blog-images';
const OLD_SLUG = '1';
const OLD_MAP_POST_ID = '1';

function requireEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

function slugify(title) {
	const base = title
		.toLowerCase()
		.trim()
		.replace(/['']/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
	const clipped = (base || 'post').slice(0, 200).replace(/-+$/g, '');
	return clipped || 'post';
}

function sanitizeUploadFilename(name) {
	const base = name.split(/[/\\]/).pop()?.trim() || 'image';
	const cleaned = base
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
	const withExt = cleaned.includes('.') ? cleaned : `${cleaned || 'image'}.bin`;
	return withExt.slice(0, 180);
}

function mimeForFilename(filename) {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.webp')) return 'image/webp';
	if (lower.endsWith('.gif')) return 'image/gif';
	return 'image/jpeg';
}

function publicUrl(supabaseUrl, path) {
	const base = supabaseUrl.replace(/\/$/, '');
	return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

function paragraphNode(text) {
	return {
		type: 'paragraph',
		content: [{ type: 'text', text }]
	};
}

function linkedParagraph(label, href) {
	return {
		type: 'paragraph',
		content: [
			{
				type: 'text',
				text: label,
				marks: [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer', class: null } }]
			}
		]
	};
}

function imageNode(src, alt = '') {
	return {
		type: 'image',
		attrs: { src, alt, title: null }
	};
}

async function main() {
	const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
	const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
	const supabase = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	const slug = slugify(TITLE);

	const { data: existing, error: existingError } = await supabase
		.from('blog_posts')
		.select('id, slug, status')
		.eq('slug', slug)
		.maybeSingle();
	if (existingError) {
		throw new Error(`Lookup by slug failed: ${existingError.message}`);
	}

	const postId = existing?.id ?? randomUUID();
	console.log(`Post id: ${postId}`);
	console.log(`Slug: ${slug}`);

	/** @type {{ path: string; publicUrl: string }[]} */
	const uploaded = [];
	for (const rel of GALLERY_FILES) {
		const abs = resolve(process.cwd(), 'public', rel);
		if (!existsSync(abs)) {
			throw new Error(`Missing image file: ${abs}`);
		}
		const filename = sanitizeUploadFilename(basename(rel));
		const storagePath = `${postId}/body/${filename}`;
		const buffer = readFileSync(abs);
		const contentType = mimeForFilename(filename);

		const { error: uploadError } = await supabase.storage
			.from(BUCKET)
			.upload(storagePath, buffer, { contentType, upsert: true });
		if (uploadError) {
			throw new Error(`Upload failed (${storagePath}): ${uploadError.message}`);
		}

		const href = publicUrl(url, storagePath);
		uploaded.push({ path: storagePath, publicUrl: href });
		console.log(`Uploaded ${storagePath}`);
	}

	const body = {
		type: 'doc',
		content: [
			...PARAGRAPHS.map(paragraphNode),
			...uploaded.map(img => imageNode(img.publicUrl)),
			paragraphNode('Get in Touch'),
			paragraphNode(
				'Questions about APIC events? We would love to hear from you.'
			),
			linkedParagraph('Email APIC', 'mailto:info.apic@aol.com')
		]
	};

	const thumbnailPath = uploaded[0]?.path ?? null;
	const row = {
		id: postId,
		slug,
		title: TITLE,
		author: AUTHOR,
		published_at: PUBLISHED_AT,
		short_description: SHORT_DESCRIPTION,
		thumbnail_path: thumbnailPath,
		body,
		status: 'published',
		deleted_at: null
	};

	if (existing) {
		const { error: updateError } = await supabase
			.from('blog_posts')
			.update({
				title: row.title,
				author: row.author,
				published_at: row.published_at,
				short_description: row.short_description,
				thumbnail_path: row.thumbnail_path,
				body: row.body,
				status: 'published',
				deleted_at: null
			})
			.eq('id', postId);
		if (updateError) {
			throw new Error(`Update blog_posts failed: ${updateError.message}`);
		}
		console.log('Updated existing blog_posts row');
	} else {
		const { error: insertError } = await supabase.from('blog_posts').insert(row);
		if (insertError) {
			throw new Error(`Insert blog_posts failed: ${insertError.message}`);
		}
		console.log('Inserted blog_posts row');
	}

	const { error: redirectError } = await supabase.from('blog_slug_redirects').upsert(
		{ old_slug: OLD_SLUG, post_id: postId },
		{ onConflict: 'old_slug' }
	);
	if (redirectError) {
		throw new Error(`Slug redirect upsert failed: ${redirectError.message}`);
	}
	console.log(`Redirect: /blog/${OLD_SLUG} → post ${postId} (canonical /blog/${slug})`);

	const { data: legacyMap, error: legacyMapError } = await supabase
		.from('blog_map_locations')
		.select(
			'post_id, address, source_url, latitude, longitude, created_by, updated_by'
		)
		.eq('post_id', OLD_MAP_POST_ID)
		.maybeSingle();
	if (legacyMapError) {
		throw new Error(`Map lookup failed: ${legacyMapError.message}`);
	}

	if (legacyMap) {
		const { error: deleteLegacyError } = await supabase
			.from('blog_map_locations')
			.delete()
			.eq('post_id', OLD_MAP_POST_ID);
		if (deleteLegacyError) {
			throw new Error(
				`Delete legacy map row failed: ${deleteLegacyError.message}`
			);
		}

		const { error: insertMapError } = await supabase
			.from('blog_map_locations')
			.upsert(
				{
					post_id: postId,
					address: legacyMap.address,
					source_url: legacyMap.source_url,
					latitude: legacyMap.latitude,
					longitude: legacyMap.longitude,
					created_by: legacyMap.created_by,
					updated_by: legacyMap.updated_by
				},
				{ onConflict: 'post_id' }
			);
		if (insertMapError) {
			throw new Error(`Map remap insert failed: ${insertMapError.message}`);
		}
		console.log(`Remapped blog_map_locations ${OLD_MAP_POST_ID} → ${postId}`);
	} else {
		const { data: alreadyMapped, error: alreadyError } = await supabase
			.from('blog_map_locations')
			.select('post_id')
			.eq('post_id', postId)
			.maybeSingle();
		if (alreadyError) {
			throw new Error(`Map check failed: ${alreadyError.message}`);
		}
		if (alreadyMapped) {
			console.log(`Map already on post ${postId}`);
		} else {
			console.warn(
				`No map row for legacy post_id '${OLD_MAP_POST_ID}' and none for ${postId}`
			);
		}
	}

	console.log('\nDone.');
	console.log(`Public URL: /blog/${slug}`);
	console.log(`Admin edit: /members/admin/blog/${postId}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
