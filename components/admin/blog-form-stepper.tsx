'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import GoogleStep from '@/components/admin/listing-form/steps/google-step';
import LocationStep from '@/components/admin/listing-form/steps/location-step';
import StepperNav from '@/components/admin/listing-form/stepper-nav';
import RedirectSuccessDialog from '@/components/admin/redirect-success-dialog';
import {
	AUTOSAVE_DEBOUNCE_MS,
	BLOG_FORM_STEPS,
	LOCATION_SUB_DETAILS,
	LOCATION_SUB_FIND,
	LOCATION_SUB_STEPS,
	normalizeBlogBody,
	STEP_BODY,
	STEP_HEADER,
	STEP_LOCATION,
	STEP_PREVIEW
} from '@/components/admin/blog-form/constants';
import {
	fromDatetimeLocalValue,
	toDatetimeLocalValue
} from '@/components/admin/blog-form/datetime-local';
import BodyStep from '@/components/admin/blog-form/steps/body-step';
import HeaderStep from '@/components/admin/blog-form/steps/header-step';
import PreviewStep from '@/components/admin/blog-form/steps/preview-step';
import { Button } from '@/components/ui/button';
import {
	createDraft,
	publish,
	updateDraft,
	uploadBlogImage
} from '@/lib/blog/admin-actions';
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
	if (!fromDatetimeLocalValue(input.publishedAtLocal)) {
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

	const [currentStep, setCurrentStep] = useState(
		mode === 'edit' ? STEP_BODY : STEP_HEADER
	);
	const [locationSubStep, setLocationSubStep] = useState(
		mapLocation ? LOCATION_SUB_DETAILS : LOCATION_SUB_FIND
	);

	const [postId, setPostId] = useState<string | null>(post?.id ?? null);
	const [slug, setSlug] = useState<string | null>(post?.slug ?? null);
	const [status, setStatus] = useState<BlogPost['status']>(
		post?.status ?? 'draft'
	);

	const [title, setTitle] = useState(post?.title ?? '');
	const [author, setAuthor] = useState(post?.author ?? defaultAuthor);
	const [publishedAtLocal, setPublishedAtLocal] = useState(() =>
		toDatetimeLocalValue(post?.published_at ?? new Date().toISOString())
	);
	const [shortDescription, setShortDescription] = useState(
		post?.short_description ?? ''
	);
	const [thumbnailPath, setThumbnailPath] = useState<string | null>(
		post?.thumbnail_path ?? null
	);
	const [thumbnailUploading, setThumbnailUploading] = useState(false);
	const [pendingThumbnailFile, setPendingThumbnailFile] = useState<File | null>(
		null
	);
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

	function draftSnapshot(publishedAtIso: string, nextBody: Json = body) {
		return JSON.stringify({
			title: title.trim(),
			author: author.trim(),
			publishedAt: publishedAtIso,
			shortDescription: shortDescription.trim(),
			thumbnailPath,
			body: nextBody
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
		setLocationSubStep(LOCATION_SUB_DETAILS);
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

		const publishedAt = fromDatetimeLocalValue(publishedAtLocal)!;
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
		setMessage('Draft created.');

		if (pendingThumbnailFile) {
			await uploadThumbnailForPost(result.id, pendingThumbnailFile);
		}

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

		const publishedAt = fromDatetimeLocalValue(publishedAtLocal)!;
		const snapshot = draftSnapshot(publishedAt);
		if (snapshot === lastSavedSnapshotRef.current) {
			setSaveStatus('saved');
			return true;
		}

		setSaveStatus('saving');
		const result = await updateDraft(id, {
			title: title.trim(),
			author: author.trim(),
			publishedAt,
			shortDescription: shortDescription.trim(),
			thumbnailPath,
			body
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
			body
		);
		setSaveStatus('saved');
		return true;
	}

	async function uploadThumbnailForPost(id: string, file: File) {
		setThumbnailUploading(true);
		setPendingThumbnailFile(null);
		try {
			const compressed = await compressBlogImage(file);
			if (isBlogImageTooLarge(compressed)) {
				setError(BLOG_IMAGE_TOO_LARGE_MESSAGE);
				return;
			}
			const formData = new FormData();
			formData.set('postId', id);
			formData.set('kind', 'thumbnail');
			formData.set('file', compressed);
			const uploaded = await uploadBlogImage(formData);
			if (!uploaded.ok) {
				setError(friendlyBlogImageUploadError(uploaded.error));
				return;
			}
			const updated = await updateDraft(id, {
				thumbnailPath: uploaded.path
			});
			if (!updated.ok) {
				setError(updated.error);
				return;
			}
			setThumbnailPath(updated.post.thumbnail_path);
			lastSavedSnapshotRef.current = draftSnapshot(
				updated.post.published_at
			);
			setMessage('Featured image uploaded.');
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			setError(friendlyBlogImageUploadError(message));
		} finally {
			setThumbnailUploading(false);
		}
	}

	async function handleThumbnailFile(file: File | null) {
		if (!file) return;
		setError(null);
		if (!postId) {
			const compressed = await compressBlogImage(file);
			if (isBlogImageTooLarge(compressed)) {
				setError(BLOG_IMAGE_TOO_LARGE_MESSAGE);
				return;
			}
			setPendingThumbnailFile(compressed);
			setMessage(
				'Image selected — it will upload after the draft is created.'
			);
			return;
		}
		await uploadThumbnailForPost(postId, file);
	}

	async function persistLocation(id: string): Promise<boolean> {
		if (lat === null || lng === null) {
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

	function saveDraftExplicit() {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			const id = await ensureDraftId();
			if (!id) return;
			const ok = await persistDraft(id);
			if (ok) setMessage('Draft saved.');
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
				const id = await ensureDraftId();
				if (!id) return;
				const ok = await persistDraft(id);
				if (!ok) return;
				setCurrentStep(STEP_LOCATION);
				return;
			}

			if (currentStep === STEP_LOCATION) {
				if (locationSubStep === LOCATION_SUB_FIND) {
					setLocationSubStep(LOCATION_SUB_DETAILS);
					return;
				}
				const id = postId ?? (await ensureDraftId());
				if (!id) return;
				const ok = await persistLocation(id);
				if (!ok) return;
				setCurrentStep(STEP_BODY);
				return;
			}

			if (currentStep === STEP_BODY) {
				const id = postId ?? (await ensureDraftId());
				if (!id) return;
				const ok = await persistDraft(id);
				if (!ok) return;
				setCurrentStep(STEP_PREVIEW);
				return;
			}

			if (isLastStep) {
				await runPublish();
			}
		});
	}

	function goBack() {
		if (currentStep === STEP_LOCATION && locationSubStep === LOCATION_SUB_DETAILS) {
			setLocationSubStep(LOCATION_SUB_FIND);
			setError(null);
			setMessage(null);
			return;
		}
		if (currentStep === 0) return;
		setError(null);
		setMessage(null);
		setCurrentStep(prev => Math.max(prev - 1, 0));
	}

	async function runPublish() {
		const id = postId ?? (await ensureDraftId());
		if (!id) return;
		const draftOk = await persistDraft(id);
		if (!draftOk) return;
		await persistLocation(id);
		const result = await publish(id);
		if (!result.ok) {
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

	// Debounced autosave once a draft id exists (header fields + body).
	useEffect(() => {
		if (!postId) return;
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

		const publishedAt = fromDatetimeLocalValue(publishedAtLocal);
		if (!publishedAt) return;

		const snapshot = draftSnapshot(publishedAt);
		if (snapshot === lastSavedSnapshotRef.current) return;

		if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
		autosaveTimerRef.current = setTimeout(() => {
			void (async () => {
				setSaveStatus('saving');
				const result = await updateDraft(postId, {
					title: title.trim(),
					author: author.trim(),
					publishedAt,
					shortDescription: shortDescription.trim(),
					thumbnailPath,
					body
				});
				if (!result.ok) {
					setSaveStatus('error');
					return;
				}
				setSlug(result.post.slug);
				lastSavedSnapshotRef.current = draftSnapshot(
					result.post.published_at,
					body
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
		postId
	]);

	const nextLabel = (() => {
		if (pending) {
			if (currentStep === STEP_HEADER) return 'Saving…';
			if (isLastStep) return 'Publishing…';
			return 'Next';
		}
		if (currentStep === STEP_LOCATION && locationSubStep === LOCATION_SUB_FIND) {
			return 'Continue to pin';
		}
		if (currentStep === STEP_LOCATION) {
			return lat === null || lng === null ? 'Skip location' : 'Next';
		}
		if (isLastStep) {
			return status === 'published' ? 'Re-publish' : 'Publish';
		}
		return 'Next';
	})();

	const publishedAtIso =
		fromDatetimeLocalValue(publishedAtLocal) ?? new Date().toISOString();

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-3 text-sm text-[#666]">
				<span className="capitalize">{mode}</span>
				{postId ? (
					<>
						<span>
							· id{' '}
							<code className="text-xs text-[#444]">{postId}</code>
						</span>
						{slug ? (
							<span>
								· slug{' '}
								<code className="text-xs text-[#444]">{slug}</code>
							</span>
						) : null}
						<span>
							·{' '}
							<span className="capitalize">{status}</span>
						</span>
						<span aria-live="polite">
							·{' '}
							{saveStatus === 'saving'
								? 'Saving…'
								: saveStatus === 'saved'
									? 'Saved'
									: saveStatus === 'error'
										? 'Save failed'
										: 'Ready'}
						</span>
					</>
				) : (
					<span>· Fill the header and continue to create a draft.</span>
				)}
			</div>

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
					onStepSelect={index => {
						startTransition(async () => {
							setError(null);
							setMessage(null);
							if (index > STEP_HEADER && !postId) {
								const id = await ensureDraftId();
								if (!id) return;
							}
							if (index === STEP_LOCATION) {
								setLocationSubStep(
									lat !== null && lng !== null
										? LOCATION_SUB_DETAILS
										: LOCATION_SUB_FIND
								);
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
							thumbnailPath={thumbnailPath}
							thumbnailUploading={thumbnailUploading}
							canUploadThumbnail={Boolean(postId)}
							onTitleChange={setTitle}
							onAuthorChange={setAuthor}
							onPublishedAtLocalChange={setPublishedAtLocal}
							onShortDescriptionChange={setShortDescription}
							onThumbnailFile={file => {
								void handleThumbnailFile(file);
							}}
						/>
					) : null}

					{currentStep === STEP_LOCATION ? (
						<section className="space-y-6">
							<div>
								<h3 className="text-sm font-medium text-[#444]">
									Article location
								</h3>
								<p className="mt-1 text-xs text-[#888]">
									Optional. Skip if this article has no map. You can add,
									change, or clear a pin anytime.
								</p>
							</div>
							<StepperNav
								steps={[...LOCATION_SUB_STEPS]}
								currentStep={locationSubStep}
								onStepSelect={setLocationSubStep}
							/>
							{locationSubStep === LOCATION_SUB_FIND ? (
								<GoogleStep
									onPlaceSelected={applyPlaceAutofill}
									onSkip={() => setLocationSubStep(LOCATION_SUB_DETAILS)}
								/>
							) : (
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
							)}
						</section>
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
							onSaveDraft={saveDraftExplicit}
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
							onClick={saveDraftExplicit}
							loading={pending && saveStatus === 'saving'}
							disabled={pending}
						>
							Save draft
						</Button>
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
						<Button
							type="button"
							loading={pending}
							onClick={goNext}
							className={
								isLastStep
									? 'border-emerald-800 bg-emerald-700 text-white hover:border-emerald-900 hover:bg-emerald-800'
									: undefined
							}
						>
							{nextLabel}
						</Button>
					</div>
				</div>
			</div>

			<RedirectSuccessDialog
				open={successTitle !== null}
				title={successTitle ?? ''}
				href={successHref}
				description="You are being redirected to the published article…"
			/>
		</div>
	);
}
