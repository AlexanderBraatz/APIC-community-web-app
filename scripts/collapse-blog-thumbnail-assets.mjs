/**
 * One-shot: collapse duplicate featured images into blog_thumbnail_assets.
 * Idempotent — safe to re-run.
 *
 * Usage (repo root):
 *   node --env-file=.env.local scripts/collapse-blog-thumbnail-assets.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const BUCKET = 'blog-images';
const HASH_CONCURRENCY = 6;

function requireEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

function sha256Hex(buffer) {
	return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
	const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
	const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
	const supabase = createClient(url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const { data: posts, error: postsError } = await supabase
		.from('blog_posts')
		.select('id, thumbnail_path, thumbnail_asset_id')
		.not('thumbnail_path', 'is', null);

	if (postsError) throw new Error(postsError.message);

	const pathToPosts = new Map();
	for (const row of posts ?? []) {
		const path = row.thumbnail_path?.trim();
		if (!path) continue;
		const list = pathToPosts.get(path) ?? [];
		list.push(row.id);
		pathToPosts.set(path, list);
	}

	const distinctPaths = [...pathToPosts.keys()];
	console.log(`Found ${distinctPaths.length} distinct thumbnail paths across ${(posts ?? []).length} posts.`);

	const pathHash = new Map();
	let skipped = 0;

	for (let i = 0; i < distinctPaths.length; i += HASH_CONCURRENCY) {
		const batch = distinctPaths.slice(i, i + HASH_CONCURRENCY);
		const hashes = await Promise.all(
			batch.map(async path => {
				const { data, error } = await supabase.storage
					.from(BUCKET)
					.download(path);
				if (error || !data) {
					console.warn(`Skip download ${path}: ${error?.message ?? 'empty'}`);
					return null;
				}
				const buffer = Buffer.from(await data.arrayBuffer());
				if (buffer.length === 0) return null;
				return sha256Hex(buffer);
			})
		);
		for (let j = 0; j < batch.length; j++) {
			const hash = hashes[j];
			if (!hash) {
				skipped += pathToPosts.get(batch[j])?.length ?? 0;
				continue;
			}
			pathHash.set(batch[j], hash);
		}
	}

	const hashCanonical = new Map();
	let assetsCreated = 0;
	let postsUpdated = 0;
	const supersededPaths = new Set();

	async function findByHash(hash) {
		const { data, error } = await supabase
			.from('blog_thumbnail_assets')
			.select('id, storage_path')
			.eq('content_sha256', hash)
			.maybeSingle();
		if (error) throw new Error(error.message);
		return data;
	}

	for (const [path, hash] of pathHash) {
		let canonical = hashCanonical.get(hash);
		if (!canonical) {
			const existingAsset = await findByHash(hash);
			if (existingAsset) {
				canonical = {
					assetId: existingAsset.id,
					storagePath: existingAsset.storage_path
				};
			} else {
				const { data: inserted, error: insertError } = await supabase
					.from('blog_thumbnail_assets')
					.insert({
						storage_path: path,
						content_sha256: hash
					})
					.select('id, storage_path')
					.single();

				if (insertError || !inserted) {
					const raced = await findByHash(hash);
					if (!raced) {
						throw new Error(
							insertError?.message ?? `Could not create asset for ${path}`
						);
					}
					canonical = {
						assetId: raced.id,
						storagePath: raced.storage_path
					};
				} else {
					canonical = {
						assetId: inserted.id,
						storagePath: inserted.storage_path
					};
					assetsCreated += 1;
				}
			}
			hashCanonical.set(hash, canonical);
		}

		if (path !== canonical.storagePath) {
			supersededPaths.add(path);
		}

		for (const postId of pathToPosts.get(path) ?? []) {
			const row = (posts ?? []).find(p => p.id === postId);
			if (
				row?.thumbnail_asset_id === canonical.assetId &&
				row.thumbnail_path === canonical.storagePath
			) {
				continue;
			}
			const { error: updateError } = await supabase
				.from('blog_posts')
				.update({
					thumbnail_asset_id: canonical.assetId,
					thumbnail_path: canonical.storagePath
				})
				.eq('id', postId);
			if (updateError) throw new Error(updateError.message);
			postsUpdated += 1;
		}
	}

	let orphansRemoved = 0;
	for (const path of supersededPaths) {
		const { data: assetOnPath } = await supabase
			.from('blog_thumbnail_assets')
			.select('id')
			.eq('storage_path', path)
			.maybeSingle();
		if (assetOnPath) continue;

		const { error: removeError } = await supabase.storage
			.from(BUCKET)
			.remove([path]);
		if (!removeError) {
			orphansRemoved += 1;
			console.log(`Removed orphan ${path}`);
		} else {
			console.warn(`Could not remove ${path}: ${removeError.message}`);
		}
	}

	console.log(
		JSON.stringify(
			{ assetsCreated, postsUpdated, orphansRemoved, skipped },
			null,
			2
		)
	);
}

main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
