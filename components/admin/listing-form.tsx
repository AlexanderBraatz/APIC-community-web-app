'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AdminPinMap from '@/components/admin/pin-map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	createListing,
	geocodeListing,
	updateListing
} from '@/lib/listings/admin-actions';
import type { AdminListing, GeocodeCandidate } from '@/lib/listings/types';
import { CATEGORY_SLUGS } from '@/lib/listings-search';

const CATEGORY_LABELS: Record<(typeof CATEGORY_SLUGS)[number], string> = {
	'food-dining': 'Food & Dining',
	'services-maintenance': 'Services & Maintenance',
	'health-wellness': 'Health & Wellness',
	'shop-market': 'Shop & Market'
};

type ListingFormProps = {
	mode: 'create' | 'edit';
	listing?: AdminListing;
	knownTags: string[];
};

export default function ListingForm({ mode, listing, knownTags }: ListingFormProps) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const [name, setName] = useState(listing?.name ?? '');
	const [type, setType] = useState(listing?.type ?? '');
	const [address, setAddress] = useState(listing?.address ?? '');
	const [contact, setContact] = useState(listing?.contact ?? '');
	const [remark, setRemark] = useState(listing?.remark ?? '');
	const [category, setCategory] = useState(listing?.category ?? 'food-dining');
	const [sourceUrl, setSourceUrl] = useState(listing?.sourceUrl ?? '');
	const [tagsText, setTagsText] = useState((listing?.tags ?? []).join(', '));
	const [lat, setLat] = useState<number | null>(listing?.lat ?? null);
	const [lng, setLng] = useState<number | null>(listing?.lng ?? null);
	const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
	const [geocodePending, setGeocodePending] = useState(false);

	const tagSuggestions = useMemo(() => {
		const active = new Set(
			tagsText
				.split(',')
				.map(t => t.trim().toLowerCase())
				.filter(Boolean)
		);
		return knownTags
			.filter(tag => !active.has(tag.toLowerCase()))
			.slice(0, 24);
	}, [knownTags, tagsText]);

	function addTag(tag: string) {
		const current = tagsText
			.split(',')
			.map(t => t.trim())
			.filter(Boolean);
		if (current.some(t => t.toLowerCase() === tag.toLowerCase())) return;
		setTagsText([...current, tag].join(', '));
	}

	function clearPin() {
		setLat(null);
		setLng(null);
	}

	async function runGeocode() {
		setGeocodePending(true);
		setError(null);
		setMessage(null);
		try {
			const result = await geocodeListing(address);
			if (!result.ok) {
				setError(result.error);
				setCandidates([]);
				return;
			}
			setCandidates(result.candidates);
			if (result.candidates.length === 0) {
				setMessage('No geocode results. Place a pin on the map instead.');
			} else if (result.candidates.length === 1) {
				const only = result.candidates[0];
				setLat(only.lat);
				setLng(only.lng);
				setAddress(only.formattedAddress);
				setMessage('Single result selected — confirm on the map, then save.');
			} else {
				setMessage('Pick a candidate below, or adjust the pin on the map.');
			}
		} finally {
			setGeocodePending(false);
		}
	}

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		formData.set('latitude', lat === null ? '' : String(lat));
		formData.set('longitude', lng === null ? '' : String(lng));
		formData.set('tags', tagsText);

		startTransition(async () => {
			setError(null);
			setMessage(null);
			if (mode === 'create') {
				const result = await createListing(formData);
				if (!result.ok) {
					setError(result.error);
					return;
				}
				router.push(`/members/admin/listings/${result.id}?message=${encodeURIComponent('Listing created.')}`);
				router.refresh();
				return;
			}

			if (!listing) return;
			const result = await updateListing(listing.id, formData);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setMessage('Listing saved.');
			router.refresh();
		});
	}

	return (
		<form onSubmit={onSubmit} className="space-y-8">
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
				</p>
			) : null}

			<section className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="name">Name</Label>
					<Input
						id="name"
						name="name"
						value={name}
						onChange={e => setName(e.target.value)}
						required
						maxLength={300}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="category">Category</Label>
					<select
						id="category"
						name="category"
						value={category}
						onChange={e =>
							setCategory(e.target.value as (typeof CATEGORY_SLUGS)[number])
						}
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
						required
					>
						{CATEGORY_SLUGS.map(slug => (
							<option key={slug} value={slug}>
								{CATEGORY_LABELS[slug]}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="type">Type</Label>
					<Input
						id="type"
						name="type"
						value={type}
						onChange={e => setType(e.target.value)}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="address">Address</Label>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input
							id="address"
							name="address"
							value={address}
							onChange={e => setAddress(e.target.value)}
							className="flex-1"
						/>
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={runGeocode}
							disabled={geocodePending || !address.trim()}
						>
							{geocodePending ? 'Geocoding…' : 'Geocode address'}
						</Button>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="contact">Contact</Label>
					<Input
						id="contact"
						name="contact"
						value={contact}
						onChange={e => setContact(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="source_url">Source URL</Label>
					<Input
						id="source_url"
						name="source_url"
						type="url"
						value={sourceUrl}
						onChange={e => setSourceUrl(e.target.value)}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="remark">Remark</Label>
					<Textarea
						id="remark"
						name="remark"
						value={remark}
						onChange={e => setRemark(e.target.value)}
						rows={4}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="tags">Tags (comma-separated)</Label>
					<Input
						id="tags"
						name="tags"
						value={tagsText}
						onChange={e => setTagsText(e.target.value)}
						placeholder="Restaurant, Montaione, wine"
					/>
					{tagSuggestions.length > 0 ? (
						<div className="flex flex-wrap gap-2 pt-1">
							{tagSuggestions.map(tag => (
								<button
									key={tag}
									type="button"
									onClick={() => addTag(tag)}
									className="border border-[#b8a99a] px-2 py-1 text-xs text-[#444] hover:bg-[#f7f2ec]"
								>
									+ {tag}
								</button>
							))}
						</div>
					) : null}
				</div>
			</section>

			{candidates.length > 1 ? (
				<section className="space-y-2">
					<h3 className="text-sm font-medium text-[#444]">Geocode candidates</h3>
					<ul className="divide-y divide-[#e5e5e5] border border-[#e5e5e5]">
						{candidates.map(candidate => (
							<li key={`${candidate.placeId}-${candidate.formattedAddress}`}>
								<button
									type="button"
									className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[#f7f2ec]"
									onClick={() => {
										setLat(candidate.lat);
										setLng(candidate.lng);
										setAddress(candidate.formattedAddress);
										setMessage('Candidate applied — confirm pin, then save.');
									}}
								>
									<span className="text-[#444]">{candidate.formattedAddress}</span>
									<span className="text-xs text-[#888]">
										{candidate.lat.toFixed(5)}, {candidate.lng.toFixed(5)}
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<section className="space-y-3">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h3 className="text-sm font-medium text-[#444]">Map pin</h3>
						<p className="text-xs text-[#888]">
							{lat !== null && lng !== null
								? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
								: 'No pin set'}
						</p>
					</div>
					{lat !== null || lng !== null ? (
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={clearPin}
						>
							Clear pin
						</Button>
					) : null}
				</div>
				<input type="hidden" name="latitude" value={lat ?? ''} />
				<input type="hidden" name="longitude" value={lng ?? ''} />
				<AdminPinMap
					lat={lat}
					lng={lng}
					onChange={coords => {
						setLat(coords.lat);
						setLng(coords.lng);
					}}
				/>
			</section>

			<div className="flex flex-wrap gap-3">
				<Button
					type="submit"
					disabled={pending}
					className="rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22]"
				>
					{pending ? 'Saving…' : mode === 'create' ? 'Create listing' : 'Save changes'}
				</Button>
				<Button
					type="button"
					variant="outline"
					className="rounded-[2px]"
					onClick={() => router.push('/members/admin/listings')}
				>
					Back to list
				</Button>
			</div>
		</form>
	);
}
