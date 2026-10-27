'use client';

import { useState, useTransition } from 'react';
import {
	createDraft,
	publish,
	softDelete,
	turnBackToDraft,
	updateDraft,
	uploadBlogImage
} from '@/lib/blog/admin-actions';
import type { BlogPost } from '@/lib/blog/types';

// Stage 3 smoke; remove or replace in Stage 4.

type LogLine = { at: string; text: string };

export function SmokeClient() {
	const [post, setPost] = useState<BlogPost | null>(null);
	const [log, setLog] = useState<LogLine[]>([]);
	const [pending, startTransition] = useTransition();
	const [file, setFile] = useState<File | null>(null);

	function push(text: string) {
		setLog(prev => [
			{ at: new Date().toISOString(), text },
			...prev
		].slice(0, 40));
	}

	function run(label: string, fn: () => Promise<void>) {
		startTransition(async () => {
			try {
				push(`→ ${label}`);
				await fn();
			} catch (error) {
				push(
					`✗ ${label}: ${error instanceof Error ? error.message : 'failed'}`
				);
			}
		});
	}

	return (
		<div className="space-y-6 text-sm">
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					disabled={pending}
					className="rounded bg-[#805b32] px-3 py-1.5 text-white disabled:opacity-50"
					onClick={() =>
						run('createDraft', async () => {
							const result = await createDraft({
								title: 'Stage 3 Smoke Post',
								author: 'Smoke Tester',
								publishedAt: new Date().toISOString(),
								shortDescription:
									'Temporary draft for Stage 3 write-API smoke.'
							});
							if (!result.ok) {
								push(`✗ createDraft: ${result.error}`);
								return;
							}
							setPost(result.post);
							push(
								`✓ createDraft id=${result.id} slug=${result.slug}`
							);
						})
					}
				>
					1. Create draft
				</button>

				<button
					type="button"
					disabled={pending || !post}
					className="rounded border border-[#805b32] px-3 py-1.5 text-[#805b32] disabled:opacity-50"
					onClick={() =>
						run('updateDraft (title)', async () => {
							if (!post) return;
							const prevThumb = post.thumbnail_path;
							const result = await updateDraft(post.id, {
								title: 'Stage 3 Smoke Post Renamed'
							});
							if (!result.ok) {
								push(`✗ updateDraft: ${result.error}`);
								return;
							}
							setPost(result.post);
							push(
								`✓ updateDraft slug ${post.slug} → ${result.post.slug}; thumbnail_path=${String(result.post.thumbnail_path)} (was ${String(prevThumb)})`
							);
						})
					}
				>
					2. Rename title (slug + redirect)
				</button>

				<button
					type="button"
					disabled={pending || !post}
					className="rounded border border-[#805b32] px-3 py-1.5 text-[#805b32] disabled:opacity-50"
					onClick={() =>
						run('publish', async () => {
							if (!post) return;
							const result = await publish(post.id);
							if (!result.ok) {
								push(`✗ publish: ${result.error}`);
								return;
							}
							setPost(result.post);
							push(`✓ publish status=${result.post.status}`);
						})
					}
				>
					3. Publish
				</button>

				<button
					type="button"
					disabled={pending || !post}
					className="rounded border border-[#805b32] px-3 py-1.5 text-[#805b32] disabled:opacity-50"
					onClick={() =>
						run('turnBackToDraft', async () => {
							if (!post) return;
							const result = await turnBackToDraft(post.id);
							if (!result.ok) {
								push(`✗ turnBackToDraft: ${result.error}`);
								return;
							}
							setPost(result.post);
							push(
								`✓ turnBackToDraft status=${result.post.status}`
							);
						})
					}
				>
					4. Turn back to draft
				</button>

				<button
					type="button"
					disabled={pending || !post}
					className="rounded border border-red-700 px-3 py-1.5 text-red-800 disabled:opacity-50"
					onClick={() =>
						run('softDelete', async () => {
							if (!post) return;
							const result = await softDelete(post.id);
							if (!result.ok) {
								push(`✗ softDelete: ${result.error}`);
								return;
							}
							push(`✓ softDelete id=${result.id}`);
							setPost(null);
						})
					}
				>
					5. Soft delete
				</button>
			</div>

			<div className="flex flex-wrap items-end gap-3">
				<label className="block space-y-1">
					<span className="text-[#555]">Thumbnail file</span>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						onChange={e => setFile(e.target.files?.[0] ?? null)}
					/>
				</label>
				<button
					type="button"
					disabled={pending || !post || !file}
					className="rounded border border-[#805b32] px-3 py-1.5 text-[#805b32] disabled:opacity-50"
					onClick={() =>
						run('uploadBlogImage', async () => {
							if (!post || !file) return;
							const fd = new FormData();
							fd.set('postId', post.id);
							fd.set('kind', 'thumbnail');
							fd.set('file', file);
							const result = await uploadBlogImage(fd);
							if (!result.ok) {
								push(`✗ upload: ${result.error}`);
								return;
							}
							push(
								`✓ upload path=${result.path} url=${result.publicUrl}`
							);
							const updated = await updateDraft(post.id, {
								thumbnailPath: result.path
							});
							if (updated.ok) {
								setPost(updated.post);
								push(
									`✓ thumbnail_path set to ${updated.post.thumbnail_path}`
								);
							} else {
								push(
									`✗ updateDraft thumbnail: ${updated.error}`
								);
							}
						})
					}
				>
					Upload thumbnail
				</button>
			</div>

			{post ? (
				<pre className="overflow-x-auto rounded bg-[#f7f3ee] p-3 text-xs">
					{JSON.stringify(post, null, 2)}
				</pre>
			) : (
				<p className="text-[#666]">No active smoke post.</p>
			)}

			<ul className="space-y-1 font-mono text-xs text-[#333]">
				{log.map((line, i) => (
					<li key={`${line.at}-${i}`}>
						<span className="text-[#888]">{line.at}</span> {line.text}
					</li>
				))}
			</ul>
		</div>
	);
}
