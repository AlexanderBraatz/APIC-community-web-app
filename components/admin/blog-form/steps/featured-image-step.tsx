'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeftRight, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemPreview,
	FileUploadItemProgress,
	FileUploadList,
	FileUploadTrigger,
	type FileUploadProps
} from '@/components/ui/file-upload';
import {
	listPreviousBlogThumbnails,
	type PreviousBlogThumbnail
} from '@/lib/blog/admin-actions';
import { BLOG_IMAGE_MAX_BYTES } from '@/lib/blog/compress-image';
import { getBlogThumbnailUrl } from '@/lib/blog/thumbnail';

type FeaturedImageStepProps = {
	thumbnailPath: string | null;
	thumbnailUploading: boolean;
	onThumbnailFile: (file: File) => Promise<boolean>;
	onSelectPrevious: (path: string) => Promise<boolean>;
	onClear: () => void | Promise<void>;
	onReject: (message: string) => void;
};

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export default function FeaturedImageStep({
	thumbnailPath,
	thumbnailUploading,
	onThumbnailFile,
	onSelectPrevious,
	onClear,
	onReject
}: FeaturedImageStepProps) {
	const [files, setFiles] = useState<File[]>([]);
	const [previousItems, setPreviousItems] = useState<PreviousBlogThumbnail[]>(
		[]
	);
	const [galleryLoaded, setGalleryLoaded] = useState(false);
	const hasSavedImage = Boolean(thumbnailPath);
	const showExistingRow = hasSavedImage && files.length === 0;
	const existingSrc = getBlogThumbnailUrl(thumbnailPath);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const result = await listPreviousBlogThumbnails();
			if (cancelled) return;
			if (result.ok) {
				setPreviousItems(result.items);
			}
			setGalleryLoaded(true);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const galleryItems = previousItems.filter(
		item => item.path !== thumbnailPath
	);

	const onUpload: NonNullable<FileUploadProps['onUpload']> = useCallback(
		async (accepted, { onProgress, onSuccess, onError }) => {
			const file = accepted[0];
			if (!file) return;

			const progressTicks = (async () => {
				const totalChunks = 10;
				for (let i = 1; i < totalChunks; i++) {
					await new Promise(resolve =>
						setTimeout(resolve, Math.random() * 200 + 100)
					);
					onProgress(file, (i / totalChunks) * 100);
				}
			})();

			try {
				const ok = await onThumbnailFile(file);
				await progressTicks;
				if (!ok) {
					onError(file, new Error('Upload failed'));
					setFiles([]);
					return;
				}
				onProgress(file, 100);
				onSuccess(file);
			} catch (error) {
				await progressTicks.catch(() => undefined);
				onError(
					file,
					error instanceof Error ? error : new Error('Upload failed')
				);
				setFiles([]);
			}
		},
		[onThumbnailFile]
	);

	const onFileReject = useCallback(
		(file: File, message: string) => {
			const name =
				file.name.length > 20 ? `${file.name.slice(0, 20)}…` : file.name;
			onReject(`${message}: “${name}” was rejected.`);
		},
		[onReject]
	);

	async function handleClearSelection() {
		setFiles([]);
		await onClear();
	}

	async function handleSelectPrevious(path: string) {
		if (thumbnailUploading) return;
		setFiles([]);
		await onSelectPrevious(path);
	}

	return (
		<section className="space-y-8">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Featured image</h3>
				<p className="mt-1 text-xs text-[#888]">
					Required. Shown on the article page and in listings.
				</p>
			</div>

			<div className="space-y-4 border border-[#b8a99a]/30 bg-white px-4 py-6 sm:px-6">
				{showExistingRow && existingSrc ? (
					<div className="flex flex-col gap-3 rounded-[2px] border border-[#b8a99a]/40 bg-white p-3">
						<div className="relative aspect-4/3 w-full overflow-hidden bg-[#e8e4dc]">
							<Image
								src={existingSrc}
								alt=""
								fill
								className="object-cover"
								sizes="(min-width: 640px) 40rem, 100vw"
							/>
						</div>
						<div className="flex w-full items-center gap-2">
							<span className="min-w-0 flex-1 text-sm font-medium text-[#333]">
								Upload successful
							</span>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={thumbnailUploading}
								onClick={() => {
									void handleClearSelection();
								}}
							>
								<ArrowLeftRight data-icon="inline-start" />
								Change image
							</Button>
						</div>
					</div>
				) : (
					<FileUpload
						value={files}
						onValueChange={next => {
							setFiles(next);
							if (next.length === 0) {
								void onClear();
							}
						}}
						onUpload={onUpload}
						onFileReject={onFileReject}
						accept={ACCEPT}
						maxFiles={1}
						maxSize={BLOG_IMAGE_MAX_BYTES}
						disabled={thumbnailUploading && files.length === 0}
						className="w-full"
					>
						{files.length > 0 ? (
							<FileUploadList>
								{files.map((file, index) => (
									<FileUploadItem
										key={`${file.name}-${file.size}-${index}`}
										value={file}
										className="flex-col gap-3 rounded-[2px] border-[#b8a99a]/40 bg-white"
									>
										<FileUploadItemPreview className="aspect-4/3 size-auto h-auto w-full rounded-[2px] border-[#b8a99a]/40" />
										<div className="flex w-full items-center gap-2">
											<span className="min-w-0 flex-1 text-sm font-medium text-[#333]">
												{thumbnailUploading
													? 'Uploading featured image…'
													: 'Upload successful'}
											</span>
											{!thumbnailUploading ? (
												<FileUploadItemDelete
													render={
														<Button
															variant="secondary"
															size="sm"
														/>
													}
												>
													<ArrowLeftRight data-icon="inline-start" />
													Change image
												</FileUploadItemDelete>
											) : null}
										</div>
										<FileUploadItemProgress className="bg-[#e8e4dc] [&>div]:bg-[#805b32]" />
									</FileUploadItem>
								))}
							</FileUploadList>
						) : (
							<FileUploadDropzone className="gap-3 rounded-[2px] border-[#b8a99a]/50 border-dashed bg-[#faf8f5] px-8 py-14 hover:bg-[#f7f2ec] data-[dragging]:border-[#805b32]/50 data-[dragging]:bg-[#f7f2ec]">
								<div className="flex flex-col items-center gap-1 text-center">
									<div className="flex items-center justify-center rounded-full border border-[#b8a99a]/40 p-2.5">
										<Upload className="size-6 text-[#888]" />
									</div>
									<p className="text-sm font-medium text-[#333]">
										Drag & drop your featured image here
									</p>
									<p className="max-w-sm text-xs text-[#888]">
										JPEG, PNG, WebP, or GIF up to 10 MiB. Used on the article
										page and in listings.
									</p>
								</div>
								<p className="text-center text-lg font-medium text-[#333]">
									Or upload from your files
								</p>
								<FileUploadTrigger
									render={
										<Button
											variant="secondary"
											className="w-fit"
										/>
									}
								>
									<Upload data-icon="inline-start" />
									Upload
								</FileUploadTrigger>
							</FileUploadDropzone>
						)}
					</FileUpload>
				)}
			</div>

			{!galleryLoaded || galleryItems.length > 0 ? (
				<div className="space-y-3">
					<h4 className="text-sm font-medium text-[#444]">
						Or select one of the images you have used before
					</h4>
					{!galleryLoaded ? (
						<ul
							aria-busy="true"
							aria-label="Loading previous images"
							className="grid w-full grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-3"
						>
							{Array.from({ length: 4 }, (_, index) => (
								<li key={index} className="min-w-0 overflow-hidden">
									<div className="relative flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-[2px] border border-[#b8a99a]/40 bg-[#e8e4dc]">
										<Loader2
											className="size-6 animate-spin text-[#805b32]"
											aria-hidden
										/>
									</div>
								</li>
							))}
						</ul>
					) : (
						<ul className="grid w-full grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-3">
							{galleryItems.map(item => (
								<li key={item.path} className="min-w-0 overflow-hidden">
									<button
										type="button"
										disabled={thumbnailUploading}
										aria-label="Use this featured image"
										onClick={() => {
											void handleSelectPrevious(item.path);
										}}
										className="relative block aspect-4/3 w-full overflow-hidden rounded-[2px] border border-[#b8a99a]/40 bg-[#e8e4dc] outline-none transition hover:border-[#805b32]/60 focus-visible:ring-2 focus-visible:ring-[#805b32]/40 disabled:opacity-50"
									>
										<Image
											src={item.publicUrl}
											alt=""
											fill
											className="object-cover"
											sizes="(min-width: 1280px) 12rem, 50vw"
										/>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			) : null}
		</section>
	);
}
