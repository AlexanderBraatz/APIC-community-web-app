'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	BLOG_THUMBNAIL_PLACEHOLDER,
	getBlogThumbnailUrl
} from '@/lib/blog/thumbnail';

type HeaderStepProps = {
	title: string;
	author: string;
	publishedAtLocal: string;
	shortDescription: string;
	thumbnailPath: string | null;
	thumbnailUploading: boolean;
	canUploadThumbnail: boolean;
	onTitleChange: (value: string) => void;
	onAuthorChange: (value: string) => void;
	onPublishedAtLocalChange: (value: string) => void;
	onShortDescriptionChange: (value: string) => void;
	onThumbnailFile: (file: File | null) => void;
};

export default function HeaderStep({
	title,
	author,
	publishedAtLocal,
	shortDescription,
	thumbnailPath,
	thumbnailUploading,
	canUploadThumbnail,
	onTitleChange,
	onAuthorChange,
	onPublishedAtLocalChange,
	onShortDescriptionChange,
	onThumbnailFile
}: HeaderStepProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const previewSrc =
		getBlogThumbnailUrl(thumbnailPath) ?? BLOG_THUMBNAIL_PLACEHOLDER;

	return (
		<section className="space-y-8">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Article header</h3>
				<p className="mt-1 text-xs text-[#888]">
					Title, byline, date, and intro as they appear on the public article.
					Featured image is optional.
				</p>
			</div>

			{/* Preview-ish typography aligned with components/blog/blog-post.tsx */}
			<div className="space-y-6 border border-[#b8a99a]/30 bg-white px-4 py-6 sm:px-6">
				<div className="space-y-2">
					<Label htmlFor="blog-title">Title</Label>
					<input
						id="blog-title"
						value={title}
						onChange={e => onTitleChange(e.target.value)}
						placeholder="Article title"
						className="w-full border-0 border-b border-[#b8a99a]/40 bg-transparent pb-2 font-heading text-3xl font-normal text-[#333333] outline-none placeholder:text-[#bbbbbb] focus:border-[#805b32] sm:text-4xl"
					/>
				</div>

				<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
					<div className="min-w-0 flex-1 space-y-2">
						<Label htmlFor="blog-author">Author</Label>
						<Input
							id="blog-author"
							value={author}
							onChange={e => onAuthorChange(e.target.value)}
							className="text-sm text-[#888888]"
						/>
					</div>
					<div className="min-w-0 flex-1 space-y-2">
						<Label htmlFor="blog-published-at">Published date</Label>
						<Input
							id="blog-published-at"
							type="datetime-local"
							value={publishedAtLocal}
							onChange={e => onPublishedAtLocalChange(e.target.value)}
							className="text-sm text-[#888888]"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="blog-intro">Short description / intro</Label>
					<Textarea
						id="blog-intro"
						value={shortDescription}
						onChange={e => onShortDescriptionChange(e.target.value)}
						rows={4}
						placeholder="Lead paragraph shown under the byline…"
						className="min-h-28 resize-y whitespace-pre-line font-sans text-base leading-relaxed text-[#555555] sm:text-lg"
					/>
				</div>

				<div className="space-y-3">
					<div>
						<Label htmlFor="blog-thumbnail">Featured image (optional)</Label>
						<p className="mt-1 text-xs text-[#888]">
							JPEG, PNG, WebP, or GIF up to 10 MiB.
							{!canUploadThumbnail
								? ' Image uploads after the draft is created.'
								: null}
						</p>
					</div>
					<input
						ref={fileInputRef}
						id="blog-thumbnail"
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						className="sr-only"
						tabIndex={-1}
						onChange={e => {
							const file = e.target.files?.[0] ?? null;
							onThumbnailFile(file);
							e.target.value = '';
						}}
					/>
					<Button
						type="button"
						variant="secondary"
						loading={thumbnailUploading}
						disabled={thumbnailUploading}
						onClick={() => fileInputRef.current?.click()}
					>
						<Upload data-icon="inline-start" />
						Upload
					</Button>
					<div className="relative mt-2 aspect-4/3 w-full max-w-md overflow-hidden bg-[#e8e4dc]">
						<Image
							src={previewSrc}
							alt=""
							fill
							className="object-cover"
							sizes="(min-width: 640px) 28rem, 100vw"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
