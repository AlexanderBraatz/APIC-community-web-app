'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { FilePenLine } from 'lucide-react';
import GoogleStep from '@/components/admin/listing-form/steps/google-step';
import LocationStep from '@/components/admin/listing-form/steps/location-step';
import StepperNav from '@/components/admin/listing-form/stepper-nav';
import RedirectSuccessDialog from '@/components/admin/redirect-success-dialog';
import {
	AUTOSAVE_DEBOUNCE_MS,
	BLOG_FORM_STEPS,
	normalizeBlogBody,
	STEP_BODY,
	STEP_FEATURED_IMAGE,
	STEP_FIND_LOCATION,
	STEP_HEADER,
	STEP_LOCATION,
	STEP_PREVIEW,
	STEP_VERIFY_LOCATION,
	toPlainBlogBody
} from '@/components/admin/blog-form/constants';
import {
	fromDateInputValue,
	toDateInputValue
} from '@/components/admin/blog-form/date-input';
import BodyStep from '@/components/admin/blog-form/steps/body-step';
import FeaturedImageStep from '@/components/admin/blog-form/steps/featured-image-step';
import HeaderStep from '@/components/admin/blog-form/steps/header-step';
import LocationIntroStep from '@/components/admin/blog-form/steps/location-intro-step';
import PreviewStep from '@/components/admin/blog-form/steps/preview-step';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import {
	clearBlogThumbnail,
	copyBlogThumbnail,
	createDraft,
	publish,
	turnBackToDraft,
	updateDraft,
	uploadBlogImage
} from '@/lib/blog/admin-actions';
import {
	blogPublishBlockersMessage,
	getBlogPublishBlockers,
	type BlogPublishBlocker
} from '@/lib/blog/body';
import {
	BLOG_IMAGE_TOO_LARGE_MESSAGE,
	compressBlogImage,
	friendlyBlogImageUploadError,
	isBlogImageTooLarge
} from '@/lib/blog/compress-image';
import {
	deleteBlogMapLocation,
	upsertBlogMapLocation,
	type BlogMapLocation
} from '@/lib/blog/map-location-actions';
import type { BlogPost } from '@/lib/blog/types';
import type { PlaceAutofill } from '@/lib/listings/types';
import type { Json } from '@/lib/supabase/database.types';

type BlogFormStepperProps = {
	mode: 'create' | 'edit';
	post?: BlogPost;
	mapLocation?: BlogMapLocation | null;
	defaultAuthor: string;
};

function parseCoordPair(
	latValue: string,
	lngValue: string
): { lat: number; lng: number } | null {
	const latTrimmed = latValue.trim();
	const lngTrimmed = lngValue.trim();
	if (!latTrimmed || !lngTrimmed) return null;
	const parsedLat = Number(latTrimmed);
	const parsedLng = Number(lngTrimmed);
	if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
	if (parsedLat < -90 || parsedLat > 90) return null;
	if (parsedLng < -180 || parsedLng > 180) return null;
	return { lat: parsedLat, lng: parsedLng };
}

function validateHeaderFields(input: {
	title: string;
	author: string;
	publishedAtLocal: string;
	shortDescription: string;
}): string | null {
	if (!input.title.trim()) return 'Title is required.';
	if (!input.author.trim()) return 'Author is required.';
	if (!input.publishedAtLocal.trim()) return 'Published date is required.';
	if (!fromDateInputValue(input.publishedAtLocal)) {
		return 'Published date is invalid.';
	}
	if (!input.shortDescription.trim()) {
		return 'Short description / intro is required.';
	}
	return null;
}

export default function BlogFormStepper({
	mode,
	post,
	mapLocation = null,
	defaultAuthor
}: BlogFormStepperProps) {
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [saveStatus, setSaveStatus] = useState<
		'idle' | 'saving' | 'saved' | 'error'
	>('idle');
	const [successTitle, setSuccessTitle] = useState<string | null>(null);
	const [successHref, setSuccessHref] = useState('/blog');
	const [publishBlockers, setPublishBlockers] = useState<
		BlogPublishBlocker[] | null
	>(null);

	const [currentStep, setCurrentStep] = useState(
		mode === 'edit' ? STEP_BODY : STEP_HEADER
	);
	const [locationSkipped, setLocationSkipped] = useState(false);

	const [postId, setPostId] = useState<string | null>(post?.id ?? null);
	const [slug, setSlug] = useState<string | null>(post?.slug ?? null);
	const [status, setStatus] = useState<BlogPost['status']>(
		post?.status ?? 'draft'
	);

	const [title, setTitle] = useState(post?.title ?? '');
	const [author, setAuthor] = useState(post?.author ?? defaultAuthor);
	const [publishedAtLocal, setPublishedAtLocal] = useState(() =>
		toDateInputValue(post?.published_at ?? new Date().toISOString())
	);
	const [shortDescription, setShortDescription] = useState(
		post?.short_description ?? ''
	);
	const [thumbnailPath, setThumbnailPath] = useState<string | null>(
		post?.thumbnail_path ?? null
	);
	const [thumbnailUploading, setThumbnailUploading] = useState(false);
	const thumbnailUploadGenRef = useRef(0);
	const [body, setBody] = useState<Json>(() => normalizeBlogBody(post?.body));

	const [address, setAddress] = useState(mapLocation?.address ?? '');
	const [sourceUrl, setSourceUrl] = useState(mapLocation?.sourceUrl ?? '');
	const [lat, setLat] = useState<number | null>(mapLocation?.lat ?? null);
	const [lng, setLng] = useState<number | null>(mapLocation?.lng ?? null);
	const [latInput, setLatInput] = useState(
		mapLocation?.lat != null ? String(mapLocation.lat) : ''
	);
	const [lngInput, setLngInput] = useState(
		mapLocation?.lng != null ? String(mapLocation.lng) : ''
	);
	const [hasMapRow, setHasMapRow] = useState(Boolean(mapLocation));

	const creatingRef = useRef(false);
	const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const skipAutosaveRef = useRef(mode === 'edit');
	const lastSavedSnapshotRef = useRef<string | null>(
		post
			? JSON.stringify({
					title: post.title,
					author: post.author,
					publishedAt: post.published_at,
					shortDescription: post.short_description,
					thumbnailPath: post.thumbnail_path,
					body: normalizeBlogBody(post.body)
				})
			: null
	);

	const lastStep = STEP_PREVIEW;
	const isLastStep = currentStep === lastStep;
	const isLocationGate = currentStep === STEP_LOCATION;
	const hasSelectedLocation =
		(lat !== null && lng !== null) || hasMapRow;
	const skippedStepIndexes = locationSkipped
		? [STEP_FIND_LOCATION, STEP_VERIFY_LOCATION]
		: undefined;

	const previewMapLocation: BlogMapLocation | null =
		postId && lat !== null && lng !== null
			? {
					postId,
					address: address.trim() || null,
					sourceUrl: sourceUrl.trim() || null,
					lat,
					lng
				}
			: null;

	function draftSnapshot(
		publishedAtIso: string,
		nextBody: Json = body,
		nextThumbnailPath: string | null = thumbnailPath
	) {
		return JSON.stringify({
			title: title.trim(),
			author: author.trim(),
			publishedAt: publishedAtIso,
			shortDescription: shortDescription.trim(),
			thumbnailPath: nextThumbnailPath,
			body: toPlainBlogBody(nextBody)
		});
	}

	function setPin(nextLat: number, nextLng: number) {
		setLat(nextLat);
		setLng(nextLng);
		setLatInput(String(nextLat));
		setLngInput(String(nextLng));
	}

	function clearPinLocal() {
		setLat(null);
		setLng(null);
		setLatInput('');
		setLngInput('');
		setAddress('');
		setSourceUrl('');
	}

	function handleLatInputChange(value: string) {
		setLatInput(value);
		const coords = parseCoordPair(value, lngInput);
		if (coords) {
			setLat(coords.lat);
			setLng(coords.lng);
		}
	}

	function handleLngInputChange(value: string) {
		setLngInput(value);
		const coords = parseCoordPair(latInput, value);
		if (coords) {
			setLat(coords.lat);
			setLng(coords.lng);
		}
	}

	function applyPlaceAutofill(place: PlaceAutofill) {
		if (place.address) setAddress(place.address);
		if (place.sourceUrl) setSourceUrl(place.sourceUrl);
		if (place.lat !== null && place.lng !== null) {
			setPin(place.lat, place.lng);
		}
		setLocationSkipped(false);
		setCurrentStep(STEP_VERIFY_LOCATION);
		setError(null);
		setMessage(null);
	}

	async function ensureDraftId(): Promise<string | null> {
		if (postId) return postId;

		const validationError = validateHeaderFields({
			title,
			author,
			publishedAtLocal,
			shortDescription
		});
		if (validationError) {
			setError(validationError);
			setCurrentStep(STEP_HEADER);
			return null;
		}

		if (creatingRef.current) return null;
		creatingRef.current = true;
		setSaveStatus('saving');

		const publishedAt = fromDateInputValue(publishedAtLocal)!;
		const result = await createDraft({
			title: title.trim(),
			author: author.trim(),
			publishedAt,
			shortDescription: shortDescription.trim(),
			thumbnailPath: thumbnailPath
		});

		creatingRef.current = false;

		if (!result.ok) {
			setSaveStatus('error');
			setError(result.error);
			return null;
		}

		setPostId(result.id);
		setSlug(result.slug);
		setStatus(result.post.status);
		lastSavedSnapshotRef.current = draftSnapshot(
			result.post.published_at,
			normalizeBlogBody(result.post.body)
		);
		setSaveStatus('saved');

		return result.id;
	}

	async function persistDraft(id: string): Promise<boolean> {
		const validationError = validateHeaderFields({
			title,
			author,
			publishedAtLocal,
			shortDescription
		});
		if (validationError) {
			setError(validationError);
			setSaveStatus('error');
			return false;
		}

		const publishedAt = fromDateInputValue(publishedAtLocal)!;
		const snapshot = draftSnapshot(publishedAt);
		if (snapshot === lastSavedSnapshotRef.current) {
			setSaveStatus('saved');
			return true;
		}

		setSaveStatus('saving');
		const plainBody = toPlainBlogBody(body);
		const result = await updateDraft(id, {
			title: title.trim(),
			author: author.trim(),
			publishedAt,
			shortDescription: shortDescription.trim(),
			thumbnailPath,
			body: plainBody
		});

		if (!result.ok) {
			setSaveStatus('error');
			setError(result.error);
			return false;
		}

		setSlug(result.post.slug);
		setStatus(result.post.status);
		setThumbnailPath(result.post.thumbnail_path);
		// Keep client body as source of truth so TipTap does not reset mid-edit.
		lastSavedSnapshotRef.current = draftSnapshot(
			result.post.published_at,
			plainBody
		);
		setSaveStatus('saved');
		return true;
	}

	async function uploadThumbnailForPost(
		id: string,
		file: File,
		uploadGen: number
	): Promise<boolean> {
		setThumbnailUploading(true);
		try {
			const compressed = await compressBlogImage(file);
			if (isBlogImageTooLarge(compressed)) {
				setError(BLOG_IMAGE_TOO_LARGE_MESSAGE);
				return false;
			}
			const formData = new FormData();
			formData.set('postId', id);
			formData.set('kind', 'thumbnail');
			formData.set('file', compressed);
			const uploaded = await uploadBlogImage(formData);
			if (!uploaded.ok) {
				setError(friendlyBlogImageUploadError(uploaded.error));
				return false;
			}
			if (uploadGen !== thumbnailUploadGenRef.current) {
				return false;
			}
			const updated = await updateDraft(id, {
				thumbnailPath: uploaded.path
			});
			if (!updated.ok) {
				setError(updated.error);
				return false;
			}
			if (uploadGen !== thumbnailUploadGenRef.current) {
				return false;
			}
			setThumbnailPath(updated.post.thumbnail_path);
			lastSavedSnapshotRef.current = draftSnapshot(
				updated.post.published_at,
				body,
				updated.post.thumbnail_path
			);
			setMessage('Featured image uploaded.');
			return true;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			setError(friendlyBlogImageUploadError(message));
			return false;
		} finally {
			setThumbnailUploading(false);
		}
	}

	async function handleThumbnailFile(file: File): Promise<boolean> {
		setError(null);
		setMessage(null);
		const uploadGen = ++thumbnailUploadGenRef.current;
		const id = postId ?? (await ensureDraftId());
		if (!id) return false;
		if (uploadGen !== thumbnailUploadGenRef.current) return false;
		return uploadThumbnailForPost(id, file, uploadGen);
	}

	async function handleSelectPreviousThumbnail(
		sourcePath: string
	): Promise<boolean> {
		setError(null);
		setMessage(null);
		const uploadGen = ++thumbnailUploadGenRef.current;
		const id = postId ?? (await ensureDraftId());
		if (!id) return false;
		if (uploadGen !== thumbnailUploadGenRef.current) return false;

		setThumbnailUploading(true);
		try {
			const copied = await copyBlogThumbnail({
				postId: id,
				sourcePath
			});
			if (!copied.ok) {
				setError(copied.error);
				return false;
			}
			if (uploadGen !== thumbnailUploadGenRef.current) {
				return false;
			}
			setThumbnailPath(copied.path);
			lastSavedSnapshotRef.current = draftSnapshot(
				fromDateInputValue(publishedAtLocal) ??
					new Date().toISOString(),
				body,
				copied.path
			);
			setMessage('Featured image selected.');
			return true;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			setError(message);
			return false;
		} finally {
			setThumbnailUploading(false);
		}
	}

	async function handleClearThumbnail() {
		thumbnailUploadGenRef.current += 1;
		setError(null);
		setMessage(null);
		if (!thumbnailPath) {
			setThumbnailPath(null);
			return;
		}
		const id = postId;
		if (!id) {
			setThumbnailPath(null);
			return;
		}
		setThumbnailUploading(true);
		try {
			const cleared = await clearBlogThumbnail(id);
			if (!cleared.ok) {
				setError(cleared.error);
				return;
			}
			setThumbnailPath(null);
			lastSavedSnapshotRef.current = draftSnapshot(
				fromDateInputValue(publishedAtLocal) ??
					new Date().toISOString(),
				body,
				null
			);
			setMessage('Featured image removed.');
		} finally {
			setThumbnailUploading(false);
		}
	}

	async function persistLocation(
		id: string,
		options?: { forceClear?: boolean }
	): Promise<boolean> {
		const forceClear = options?.forceClear === true;
		if (forceClear || lat === null || lng === null) {
			if (hasMapRow) {
				const cleared = await deleteBlogMapLocation(id);
				if (!cleared.ok) {
					setError(cleared.error);
					return false;
				}
				setHasMapRow(false);
			}
			return true;
		}

		try {
			await upsertBlogMapLocation({
				postId: id,
				address: address.trim() || null,
				sourceUrl: sourceUrl.trim() || null,
				lat,
				lng
			});
			setHasMapRow(true);
			return true;
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Could not save location'
			);
			return false;
		}
	}

	async function handleClearPin() {
		clearPinLocal();
		if (!postId || !hasMapRow) return;
		setError(null);
		startTransition(async () => {
			const cleared = await deleteBlogMapLocation(postId);
			if (!cleared.ok) {
				setError(cleared.error);
				return;
			}
			setHasMapRow(false);
			setMessage('Map location cleared.');
		});
	}

	function saveExplicit() {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			const id = await ensureDraftId();
			if (!id) return;
			const ok = await persistDraft(id);
			if (!ok) return;
			setMessage(
				status === 'published'
					? 'Live article updated.'
					: 'Draft saved.'
			);
		});
	}

	function handleTurnToDraft() {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			const id = await ensureDraftId();
			if (!id) return;
			const draftOk = await persistDraft(id);
			if (!draftOk) return;
			const result = await turnBackToDraft(id);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setStatus(result.post.status);
			setSlug(result.post.slug);
			setMessage(
				'Article turned back into a draft. Autosave is on while you edit.'
			);
		});
	}

	function openPublishBlockersDialog(blockers: BlogPublishBlocker[]) {
		setPublishBlockers(blockers);
	}

	function goToPublishBlockerStep(blocker: BlogPublishBlocker) {
		setPublishBlockers(null);
		setError(null);
		setMessage(null);
		setCurrentStep(
			blocker === 'featured' ? STEP_FEATURED_IMAGE : STEP_BODY
		);
	}

	function addLocation() {
		setError(null);
		setMessage(null);
		setLocationSkipped(false);
		setCurrentStep(STEP_FIND_LOCATION);
	}

	function skipLocation() {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			setLocationSkipped(true);
			clearPinLocal();
			const id = postId ?? (await ensureDraftId());
			if (!id) return;
			const ok = await persistLocation(id, { forceClear: true });
			if (!ok) return;
			setCurrentStep(STEP_BODY);
		});
	}

	function goNext() {
		startTransition(async () => {
			setError(null);
			setMessage(null);

			if (currentStep === STEP_HEADER) {
				const validationError = validateHeaderFields({
					title,
					author,
					publishedAtLocal,
					shortDescription
				});
				if (validationError) {
					setError(validationError);
					return;
				}
				if (status !== 'published') {
					const id = await ensureDraftId();
					if (!id) return;
					const ok = await persistDraft(id);
					if (!ok) return;
				}
				setCurrentStep(STEP_FEATURED_IMAGE);
				return;
			}

			if (currentStep === STEP_FEATURED_IMAGE) {
				if (thumbnailUploading) return;
				if (!thumbnailPath) {
					openPublishBlockersDialog(['featured']);
					return;
				}
				setCurrentStep(STEP_LOCATION);
				return;
			}

			if (currentStep === STEP_FIND_LOCATION) {
				setLocationSkipped(false);
				setCurrentStep(STEP_VERIFY_LOCATION);
				return;
			}

			if (currentStep === STEP_VERIFY_LOCATION) {
				const id = postId ?? (await ensureDraftId());
				if (!id) return;
				const ok = await persistLocation(id);
				if (!ok) return;
				setLocationSkipped(false);
				setCurrentStep(STEP_BODY);
				return;
			}

			if (currentStep === STEP_BODY) {
				if (status !== 'published') {
					const id = postId ?? (await ensureDraftId());
					if (!id) return;
					const ok = await persistDraft(id);
					if (!ok) return;
				}
				setCurrentStep(STEP_PREVIEW);
				return;
			}

			if (isLastStep) {
				await runPublish();
			}
		});
	}

	function goBack() {
		if (currentStep === 0) return;
		setError(null);
		setMessage(null);
		setCurrentStep(prev => Math.max(prev - 1, 0));
	}

	async function runPublish() {
		const blockers = getBlogPublishBlockers({
			thumbnailPath,
			body: toPlainBlogBody(body)
		});
		if (blockers.length > 0) {
			openPublishBlockersDialog(blockers);
			return;
		}

		const id = postId ?? (await ensureDraftId());
		if (!id) return;
		const draftOk = await persistDraft(id);
		if (!draftOk) return;
		await persistLocation(id);

		const afterSaveBlockers = getBlogPublishBlockers({
			thumbnailPath,
			body: toPlainBlogBody(body)
		});
		if (afterSaveBlockers.length > 0) {
			openPublishBlockersDialog(afterSaveBlockers);
			return;
		}

		const result = await publish(id);
		if (!result.ok) {
			const serverBlockers = getBlogPublishBlockers({
				thumbnailPath,
				body: toPlainBlogBody(body)
			});
			if (serverBlockers.length > 0) {
				openPublishBlockersDialog(serverBlockers);
				return;
			}
			setError(result.error);
			return;
		}
		setStatus(result.post.status);
		setSlug(result.post.slug);
		setSuccessHref(`/blog/${result.post.slug}`);
		setSuccessTitle(
			result.post.status === 'published'
				? 'Article published'
				: 'Article updated'
		);
	}

	function handlePublish() {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			await runPublish();
		});
	}

	// Debounced autosave for drafts only — published posts need Turn to draft
	// or an explicit Save before live content changes.
	useEffect(() => {
		if (!postId) return;
		if (status === 'published') return;
		if (skipAutosaveRef.current) {
			skipAutosaveRef.current = false;
			return;
		}

		const validationError = validateHeaderFields({
			title,
			author,
			publishedAtLocal,
			shortDescription
		});
		if (validationError) return;

		const publishedAt = fromDateInputValue(publishedAtLocal);
		if (!publishedAt) return;

		const snapshot = draftSnapshot(publishedAt);
		if (snapshot === lastSavedSnapshotRef.current) return;

		if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
		autosaveTimerRef.current = setTimeout(() => {
			void (async () => {
				setSaveStatus('saving');
				const plainBody = toPlainBlogBody(body);
				const result = await updateDraft(postId, {
					title: title.trim(),
					author: author.trim(),
					publishedAt,
					shortDescription: shortDescription.trim(),
					thumbnailPath,
					body: plainBody
				});
				if (!result.ok) {
					setSaveStatus('error');
					return;
				}
				setSlug(result.post.slug);
				lastSavedSnapshotRef.current = draftSnapshot(
					result.post.published_at,
					plainBody
				);
				setSaveStatus('saved');
			})();
		}, AUTOSAVE_DEBOUNCE_MS);

		return () => {
			if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional field deps
	}, [
		title,
		author,
		publishedAtLocal,
		shortDescription,
		thumbnailPath,
		body,
		postId,
		status
	]);

	const nextLabel = (() => {
		if (pending) {
			if (currentStep === STEP_HEADER) return 'Saving…';
			if (isLastStep) return 'Publishing…';
			return 'Next';
		}
		if (currentStep === STEP_FIND_LOCATION) {
			return 'Continue';
		}
		if (isLastStep) {
			return status === 'published' ? 'Re-publish' : 'Publish';
		}
		return 'Next';
	})();

	const publishedAtIso =
		fromDateInputValue(publishedAtLocal) ?? new Date().toISOString();
	const isLive = status === 'published';

	return (
		<div className="space-y-6">
			{isLive ? (
				<p
					className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
					role="status"
				>
					This article is live. Changes are not autosaved. Turn back
					into Draft to edit safely, or use Save changes / Publish to
					update the live article.
				</p>
			) : null}
			{error ? (
				<p
					className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}
			{message ? (
				<p
					className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{message}
					{status === 'published' && slug ? (
						<>
							{' '}
							<Link
								href={`/blog/${slug}`}
								className="underline"
							>
								Open article
							</Link>
						</>
					) : null}
				</p>
			) : null}

			<div className="flex flex-col gap-8 lg:flex-row lg:items-start">
				<StepperNav
					steps={[...BLOG_FORM_STEPS]}
					currentStep={currentStep}
					skippedSteps={skippedStepIndexes}
					onStepSelect={index => {
						startTransition(async () => {
							setError(null);
							setMessage(null);
							if (index > STEP_HEADER && !postId) {
								const id = await ensureDraftId();
								if (!id) return;
							}
							if (index > STEP_FEATURED_IMAGE && !thumbnailPath) {
								openPublishBlockersDialog(['featured']);
								setCurrentStep(STEP_FEATURED_IMAGE);
								return;
							}
							if (
								index === STEP_FIND_LOCATION ||
								index === STEP_VERIFY_LOCATION
							) {
								setLocationSkipped(false);
							}
							setCurrentStep(index);
						});
					}}
				/>

				<div className="min-w-0 flex-1 space-y-8 pb-28">
					{currentStep === STEP_HEADER ? (
						<HeaderStep
							title={title}
							author={author}
							publishedAtLocal={publishedAtLocal}
							shortDescription={shortDescription}
							onTitleChange={setTitle}
							onAuthorChange={setAuthor}
							onPublishedAtLocalChange={setPublishedAtLocal}
							onShortDescriptionChange={setShortDescription}
						/>
					) : null}

					{currentStep === STEP_FEATURED_IMAGE ? (
						<FeaturedImageStep
							thumbnailPath={thumbnailPath}
							thumbnailUploading={thumbnailUploading}
							onThumbnailFile={handleThumbnailFile}
							onSelectPrevious={handleSelectPreviousThumbnail}
							onClear={handleClearThumbnail}
							onReject={message => {
								setError(message);
								setMessage(null);
							}}
						/>
					) : null}

					{currentStep === STEP_LOCATION ? (
						<LocationIntroStep
							hasLocation={hasSelectedLocation}
							onAddOrChange={addLocation}
							onRemoveAndSkip={skipLocation}
							disabled={pending}
						/>
					) : null}

					{currentStep === STEP_FIND_LOCATION ? (
						<GoogleStep
							onPlaceSelected={applyPlaceAutofill}
							onSkip={() => {
								setLocationSkipped(false);
								setCurrentStep(STEP_VERIFY_LOCATION);
							}}
						/>
					) : null}

					{currentStep === STEP_VERIFY_LOCATION ? (
						<LocationStep
							address={address}
							sourceUrl={sourceUrl}
							lat={lat}
							lng={lng}
							latInput={latInput}
							lngInput={lngInput}
							onAddressChange={setAddress}
							onSourceUrlChange={setSourceUrl}
							onLatInputChange={handleLatInputChange}
							onLngInputChange={handleLngInputChange}
							onClearPin={() => {
								void handleClearPin();
							}}
							onPinChange={coords => setPin(coords.lat, coords.lng)}
						/>
					) : null}

					{currentStep === STEP_BODY && postId ? (
						<BodyStep
							postId={postId}
							body={body}
							onBodyChange={setBody}
							onError={setError}
						/>
					) : null}

					{currentStep === STEP_BODY && !postId ? (
						<p className="text-sm text-[#666]">
							Complete the Header step first so a draft exists before editing
							the body.
						</p>
					) : null}

					{currentStep === STEP_PREVIEW && postId ? (
						<PreviewStep
							post={{
								id: postId,
								slug: slug ?? '',
								title,
								author,
								published_at: publishedAtIso,
								short_description: shortDescription,
								thumbnail_path: thumbnailPath,
								body,
								status
							}}
							mapLocation={previewMapLocation}
							pending={pending}
							onSave={saveExplicit}
							onPublish={handlePublish}
						/>
					) : null}
				</div>
			</div>

			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#b8a99a]/30 bg-[#f7f2ec]/95 backdrop-blur-sm">
				<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="secondary"
							onClick={saveExplicit}
							loading={pending && saveStatus === 'saving'}
							disabled={pending}
						>
							{isLive ? 'Save changes' : 'Save draft'}
						</Button>
						{isLive && postId ? (
							<Button
								type="button"
								variant="outline"
								className="gap-1.5"
								onClick={handleTurnToDraft}
								loading={pending}
								disabled={pending}
							>
								<FilePenLine className="size-3.5" aria-hidden />
								Turn back into Draft
							</Button>
						) : null}
					</div>
					<div className="flex flex-wrap items-center justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={goBack}
							disabled={pending || currentStep === STEP_HEADER}
						>
							Back
						</Button>
						{isLocationGate ? (
							<div className="grid w-full max-w-sm grid-cols-2 gap-2 sm:w-auto sm:min-w-[20rem]">
								<Button
									type="button"
									onClick={addLocation}
									disabled={pending}
									className="w-full"
								>
									{hasSelectedLocation
										? 'Change location'
										: 'Add Location'}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={skipLocation}
									disabled={pending}
									className="w-full"
								>
									{hasSelectedLocation
										? 'Remove and skip'
										: 'Skip Location'}
								</Button>
							</div>
						) : (
							<Button
								type="button"
								loading={pending}
								disabled={
									pending ||
									(currentStep === STEP_FEATURED_IMAGE &&
										(thumbnailUploading || !thumbnailPath))
								}
								onClick={goNext}
								className={
									isLastStep
										? 'border-emerald-800 bg-emerald-700 text-white hover:border-emerald-900 hover:bg-emerald-800'
										: undefined
								}
							>
								{nextLabel}
							</Button>
						)}
					</div>
				</div>
			</div>

			<RedirectSuccessDialog
				open={successTitle !== null}
				title={successTitle ?? ''}
				href={successHref}
				description="You are being redirected to the published article…"
			/>

			<Dialog
				open={publishBlockers !== null}
				onOpenChange={open => {
					if (!open) setPublishBlockers(null);
				}}
			>
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Can&apos;t publish yet</DialogTitle>
						<DialogDescription>
							{publishBlockers
								? blogPublishBlockersMessage(publishBlockers)
								: ''}
						</DialogDescription>
					</DialogHeader>
					<ul className="list-disc space-y-1 pl-5 text-sm text-[#555]">
						{publishBlockers?.includes('featured') ? (
							<li>Featured image is required</li>
						) : null}
						{publishBlockers?.includes('body') ? (
							<li>Article body content is required</li>
						) : null}
					</ul>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setPublishBlockers(null)}
						>
							Cancel
						</Button>
						{publishBlockers?.includes('featured') ? (
							<Button
								type="button"
								onClick={() => goToPublishBlockerStep('featured')}
							>
								Add featured image
							</Button>
						) : null}
						{publishBlockers?.includes('body') ? (
							<Button
								type="button"
								variant={
									publishBlockers.includes('featured')
										? 'secondary'
										: 'default'
								}
								onClick={() => goToPublishBlockerStep('body')}
							>
								Add body content
							</Button>
						) : null}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
