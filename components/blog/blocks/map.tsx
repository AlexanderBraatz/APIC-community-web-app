'use client';

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import MapLocationModal from '@/components/blog/blocks/map-location-modal';
import BlogMapDisplay from '@/components/blog/blog-map-display';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	getBlogMapLocation,
	type BlogMapLocation
} from '@/lib/blog/map-location-actions';
import { createClient } from '@/lib/supabase/client';
import { isBlogMapPostId } from '@/lib/blog/map-post-id';

export default function BlogMap(props: { postId?: string | null }) {
	const postId =
		typeof props.postId === 'string' && isBlogMapPostId(props.postId)
			? props.postId.trim()
			: null;

	const [isAdmin, setIsAdmin] = useState(false);
	const [authReady, setAuthReady] = useState(false);
	const [location, setLocation] = useState<BlogMapLocation | null>(null);
	const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
		'loading'
	);
	const [modalOpen, setModalOpen] = useState(false);

	useEffect(() => {
		const supabase = createClient();
		let cancelled = false;

		async function syncAdmin() {
			const { data } = await supabase.auth.getClaims();
			if (!data?.claims) {
				if (!cancelled) {
					setIsAdmin(false);
					setAuthReady(true);
				}
				return;
			}
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) {
				if (!cancelled) {
					setIsAdmin(false);
					setAuthReady(true);
				}
				return;
			}
			const { data: profile } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', user.id)
				.maybeSingle();
			if (!cancelled) {
				setIsAdmin(profile?.role === 'admin');
				setAuthReady(true);
			}
		}

		void syncAdmin();
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange(() => {
			void syncAdmin();
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, []);

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

	if (loadState === 'loading' || !authReady) {
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

	if (!location && !isAdmin) {
		return null;
	}

	return (
		<section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-3xl">
				{location ? (
					<BlogMapDisplay
						location={location}
						footerExtra={
							isAdmin ? (
								<button
									type="button"
									onClick={() => setModalOpen(true)}
									className={cn(
										buttonVariants({ variant: 'secondary', size: 'sm' }),
										'gap-1.5'
									)}
								>
									<Pencil
										className="size-3.5"
										aria-hidden="true"
									/>
									Edit as Admin
								</button>
							) : null
						}
					/>
				) : (
					<div className="relative aspect-[1.618/1] w-full overflow-hidden rounded-3xl border border-[#b8a99a]/40 bg-[#e8e4dc]">
						<div
							className="absolute inset-0 opacity-40"
							style={{
								backgroundImage:
									'linear-gradient(135deg, #ebe6dc 25%, #e0d8cc 25%, #e0d8cc 50%, #ebe6dc 50%, #ebe6dc 75%, #e0d8cc 75%)',
								backgroundSize: '24px 24px'
							}}
							aria-hidden="true"
						/>
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/90 px-6 text-center">
							<p className="font-heading max-w-sm text-base text-[#444444]">
								No location has been chosen yet.
							</p>
							<button
								type="button"
								onClick={() => setModalOpen(true)}
								className={cn(
									buttonVariants({ variant: 'default' }),
									'w-full sm:w-auto'
								)}
							>
								Set location
							</button>
						</div>
					</div>
				)}

				{loadState === 'error' && isAdmin ? (
					<p
						className="mt-3 text-sm text-red-700"
						role="alert"
					>
						Could not load map location. Try refreshing the page.
					</p>
				) : null}
			</div>

			{isAdmin ? (
				<MapLocationModal
					open={modalOpen}
					onOpenChange={setModalOpen}
					postId={postId}
					initial={location}
					onSaved={saved => {
						setLocation(saved);
						setLoadState('ready');
					}}
				/>
			) : null}
		</section>
	);
}
