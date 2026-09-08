'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TinaField } from '@tinacms/schema-tools';
import { wrapFieldsWithMeta } from 'tinacms';
import { isNumericPostId } from './blog-post-id';

type TinaStringFieldComponent = (props: {
	field: TinaField & { namespace: string[] };
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

export const BlogIdField = wrapFieldsWithMeta(props => {
	const { input } = props;
	const requested = useRef(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(!input.value);

	const assignId = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			const res = await fetch('/api/blog/next-id');
			if (!res.ok) throw new Error('Failed to allocate blog id');
			const data = (await res.json()) as { id: number };
			if (!data.id) throw new Error('Invalid blog id response');
			input.onChange(String(data.id));
		} catch {
			setError('Could not assign Post ID. Retry before uploading or saving.');
			requested.current = false;
		} finally {
			setLoading(false);
		}
	}, [input]);

	useEffect(() => {
		if (isNumericPostId(input.value) || requested.current) {
			setLoading(false);
			return;
		}
		requested.current = true;
		void assignId();
	}, [assignId, input.value]);

	if (isNumericPostId(input.value)) {
		return (
			<div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
				<span className="font-medium">Post ID:</span> {input.value}
				<p className="mt-1 text-xs text-gray-500">
					Used in the URL (/blog/{input.value}) and media folder
					(images/blog/{input.value}/). Wait for this ID before uploading
					images or saving.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
			{loading ? (
				<span>Assigning Post ID…</span>
			) : (
				<div className="flex flex-col gap-2">
					<span>{error || 'Post ID is required.'}</span>
					<button
						type="button"
						className="w-fit rounded border border-amber-800 px-3 py-1 text-xs font-medium hover:bg-amber-100"
						onClick={() => {
							requested.current = true;
							void assignId();
						}}
					>
						Retry
					</button>
				</div>
			)}
		</div>
	);
}) as unknown as TinaStringFieldComponent;
