'use client';

import BlogArticleView from '@/components/blog/blog-article-view';
import {
	AnalyticsEvents,
	useAnalytics
} from '@/components/analytics/posthog-provider';
import type { BlogNeighbor, BlogPost as BlogPostData } from '@/lib/blog/types';
import { useEffect } from 'react';

export default function BlogPost({
	post,
	previousPost,
	nextPost,
	isAdmin = false
}: {
	post: BlogPostData;
	previousPost?: BlogNeighbor | null;
	nextPost?: BlogNeighbor | null;
	isAdmin?: boolean;
}) {
	const { track } = useAnalytics();

	useEffect(() => {
		if (post.slug) {
			track(AnalyticsEvents.EVENT_OPENED, { content_id: post.slug });
		}
	}, [post.slug, track]);

	return (
		<BlogArticleView
			post={post}
			previousPost={previousPost}
			nextPost={nextPost}
			isAdmin={isAdmin}
			interactiveNav
			mapMode="fetch"
		/>
	);
}
