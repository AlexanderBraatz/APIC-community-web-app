'use client';

import { useEffect } from 'react';
import type { TinaField } from '@tinacms/schema-tools';
import { wrapFieldsWithMeta } from 'tinacms';
import { isNumericPostId } from './blog-post-id';

type TinaStringFieldComponent = (props: {
	field: TinaField & { namespace: string[] };
	form?: {
		getFieldState?: (name: string) => { value?: unknown } | undefined;
		getState?: () => { values?: Record<string, unknown> };
	};
	input: {
		name: string;
		onBlur: (event?: React.FocusEvent<string>) => void;
		onChange: (event: React.ChangeEvent<string> | string) => void;
		onFocus: (event?: React.FocusEvent<string>) => void;
		type?: string;
		value: string;
	};
	meta: { active?: boolean; dirty?: boolean; error?: unknown };
}) => React.ReactNode;

function readFormPostId(form?: {
	getFieldState?: (name: string) => { value?: unknown } | undefined;
	getState?: () => { values?: Record<string, unknown> };
}): string | null {
	const raw =
		form?.getFieldState?.('postId')?.value ??
		form?.getState?.()?.values?.postId;
	if (typeof raw !== 'string') return null;
	return isNumericPostId(raw) ? raw.trim() : null;
}

/** Copies the blog post's postId onto the map block; location is set outside Tina. */
export const BlogMapPostIdField = wrapFieldsWithMeta(props => {
	const { input, form } = props;
	const formPostId = readFormPostId(form);

	useEffect(() => {
		if (!formPostId) return;
		if (input.value === formPostId) return;
		input.onChange(formPostId);
	}, [formPostId, input]);

	const postId = isNumericPostId(input.value)
		? input.value.trim()
		: formPostId;

	if (postId) {
		return (
			<div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
				<span className="font-medium">Linked post ID:</span> {postId}
				<p className="mt-1 text-xs text-gray-500">
					This Map block is tied to post {postId}. After publishing, open
					the post on the site as an admin and use Set location / Edit to
					choose the place (Places search, address, and map pin). Location
					data is stored in the database, not in this form.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
			Wait for Post ID on the post before this Map block can link. Location
			is set later on the published page as an admin.
		</div>
	);
}) as unknown as TinaStringFieldComponent;
