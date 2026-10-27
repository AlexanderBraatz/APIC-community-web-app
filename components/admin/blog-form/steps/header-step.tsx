'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type HeaderStepProps = {
	title: string;
	author: string;
	publishedAtLocal: string;
	shortDescription: string;
	onTitleChange: (value: string) => void;
	onAuthorChange: (value: string) => void;
	onPublishedAtLocalChange: (value: string) => void;
	onShortDescriptionChange: (value: string) => void;
};

export default function HeaderStep({
	title,
	author,
	publishedAtLocal,
	shortDescription,
	onTitleChange,
	onAuthorChange,
	onPublishedAtLocalChange,
	onShortDescriptionChange
}: HeaderStepProps) {
	return (
		<section className="space-y-8">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Article header</h3>
				<p className="mt-1 text-xs text-[#888]">
					Title, byline, date, and intro as they appear on the public article.
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
			</div>
		</section>
	);
}
