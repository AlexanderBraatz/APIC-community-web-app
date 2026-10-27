'use client';

import { useEffect, useState } from 'react';
import BlogMapDisplay from '@/components/blog/blog-map-display';
import {
	getBlogMapLocation,
	type BlogMapLocation
} from '@/lib/blog/map-location-actions';
import { isBlogMapPostId } from '@/lib/blog/map-post-id';

export default function BlogMap(props: {
	postId?: string | null;
	/** Shown in the map pin tooltip instead of the address. */
	title?: string | null;
}) {
	const postId =
		typeof props.postId === 'string' && isBlogMapPostId(props.postId)
			? props.postId.trim()
			: null;
	const title = props.title?.trim() || null;

	const [location, setLocation] = useState<BlogMapLocation | null>(null);
	const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
		'loading'
	);

	useEffect(() => {
		if (!postId) {
			setLocation(null);
			setLoadState('ready');
			return;
		}

		let cancelled = false;
		setLoadState('loading');

		void getBlogMapLocation(postId)
			.then(row => {
				if (cancelled) return;
				setLocation(row);
				setLoadState('ready');
			})
			.catch(() => {
				if (cancelled) return;
				setLocation(null);
				setLoadState('error');
			});

		return () => {
			cancelled = true;
		};
	}, [postId]);

	if (!postId) {
		return null;
	}

	if (loadState === 'loading') {
		return (
			<section
				className="bg-white px-4 py-10 sm:px-6 lg:px-8"
				aria-busy="true"
			>
				<div className="mx-auto max-w-3xl">
					<div className="aspect-[1.618/1] w-full animate-pulse rounded-3xl border border-[#b8a99a]/40 bg-[#e8e4dc]" />
				</div>
			</section>
		);
	}

	if (!location) {
		return null;
	}

	return (
		<section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-3xl">
				<BlogMapDisplay location={location} title={title} />
			</div>
		</section>
	);
}
