import type { Json } from '@/lib/supabase/database.types';

export type BlogPostStatus = 'draft' | 'published' | 'deleted';

/** UI-facing blog post row (excludes soft-deleted). */
export type BlogPost = {
	id: string;
	slug: string;
	title: string;
	author: string;
	published_at: string;
	short_description: string;
	thumbnail_path: string | null;
	body: Json;
	status: BlogPostStatus;
};

export type BlogNeighbor = {
	slug: string;
	title: string;
};

export type GetPostBySlugResult =
	| { kind: 'post'; post: BlogPost }
	| { kind: 'redirect'; slug: string }
	| { kind: 'not_found' };
