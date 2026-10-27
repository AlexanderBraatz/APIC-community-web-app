/** Browser-only helpers for blog image uploads (thumbnail + TipTap body). */

export const BLOG_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB

export const BLOG_IMAGE_TOO_LARGE_MESSAGE =
	'This photo is too large to upload. Please choose a smaller image (under about 10 MB) and try again.';

export const BLOG_IMAGE_MIME_MESSAGE =
	'Please use a JPEG, PNG, WebP, or GIF image.';

const SKIP_COMPRESS_BYTES = 400 * 1024;
const MAX_LONGEST_EDGE = 2000;
const JPEG_QUALITY = 0.82;

export function isBlogImageTooLarge(file: File): boolean {
	return file.size > BLOG_IMAGE_MAX_BYTES;
}

/** True when a thrown/returned error is about payload or image size. */
export function isBlogImageSizeError(message: string): boolean {
	const lower = message.toLowerCase();
	return (
		lower.includes('too large to upload') ||
		lower.includes('body exceeded') ||
		lower.includes('body size limit') ||
		lower.includes('10 mib') ||
		lower.includes('10 mb') ||
		(lower.includes('size limit') && lower.includes('server action'))
	);
}

export function friendlyBlogImageUploadError(error: string): string {
	if (isBlogImageSizeError(error)) return BLOG_IMAGE_TOO_LARGE_MESSAGE;
	return error;
}

/**
 * Resize/compress for upload. GIFs and already-small files pass through.
 * On canvas/bitmap failure, returns the original file.
 */
export async function compressBlogImage(file: File): Promise<File> {
	if (file.type === 'image/gif') return file;
	if (file.size > 0 && file.size <= SKIP_COMPRESS_BYTES) return file;

	try {
		const bitmap = await createImageBitmap(file);
		const { width, height } = bitmap;
		const longest = Math.max(width, height);
		const scale = longest > MAX_LONGEST_EDGE ? MAX_LONGEST_EDGE / longest : 1;
		const targetW = Math.max(1, Math.round(width * scale));
		const targetH = Math.max(1, Math.round(height * scale));

		const canvas = document.createElement('canvas');
		canvas.width = targetW;
		canvas.height = targetH;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			bitmap.close();
			return file;
		}
		ctx.drawImage(bitmap, 0, 0, targetW, targetH);
		bitmap.close();

		const blob = await new Promise<Blob | null>(resolve => {
			canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
		});
		if (!blob) return file;

		const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
		return new File([blob], `${baseName}.jpg`, {
			type: 'image/jpeg',
			lastModified: Date.now()
		});
	} catch {
		return file;
	}
}
