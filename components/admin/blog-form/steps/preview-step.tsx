'use client';

import BlogArticleView from '@/components/blog/blog-article-view';
import { Button } from '@/components/ui/button';
import type { BlogMapLocation } from '@/lib/blog/map-location-actions';
import type { BlogPost } from '@/lib/blog/types';
import type { Json } from '@/lib/supabase/database.types';

type PreviewStepProps = {
	post: {
		id: string;
		slug: string;
		title: string;
		author: string;
		published_at: string;
		short_description: string;
		thumbnail_path: string | null;
		body: Json;
		status: BlogPost['status'];
	};
	mapLocation: BlogMapLocation | null;
	pending: boolean;
	onSaveDraft: () => void;
	onPublish: () => void;
};

export default function PreviewStep({
	post,
	mapLocation,
	pending,
	onSaveDraft,
	onPublish
}: PreviewStepProps) {
	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h3 className="text-sm font-medium text-[#444]">Preview & publish</h3>
					<p className="mt-1 text-xs text-[#888]">
						This matches the public article layout. Save the draft or publish when
						ready.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						variant="secondary"
						onClick={onSaveDraft}
						disabled={pending}
					>
						Save draft
					</Button>
					<Button
						type="button"
						onClick={onPublish}
						loading={pending}
						disabled={pending}
						className="border-emerald-800 bg-emerald-700 text-white hover:border-emerald-900 hover:bg-emerald-800"
					>
						{post.status === 'published' ? 'Re-publish' : 'Publish'}
					</Button>
				</div>
			</div>

			<div className="overflow-hidden rounded border border-[#b8a99a]/40 bg-white shadow-sm">
				<BlogArticleView
					post={post}
					isAdmin
					interactiveNav={false}
					mapMode={mapLocation ? 'static' : 'none'}
					mapLocation={mapLocation}
				/>
			</div>
		</section>
	);
}
