'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TinaField } from '@tinacms/schema-tools';
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

type TinaForm = {
	change?: (name: string, value: unknown) => void;
	getState?: () => { values?: Record<string, unknown> };
};

function isStarterTitle(title: unknown): boolean {
	if (typeof title !== 'string') return true;
	const trimmed = title.trim();
	if (!trimmed) return true;
	if (trimmed === 'New blog post') return true;
	// e.g. "1 — New blog post" or "21 - New blog post"
	return /^\d+\s*[—–-]\s*New blog post$/i.test(trimmed);
}

function starterTitleForId(id: string | number) {
	return `${id} — New blog post`;
}

/** Auto-assigns postId; UI is hidden unless assignment is pending or failed. */
export const BlogIdField = ((props: {
	form?: TinaForm;
	tinaForm?: TinaForm;
	input: {
		onChange: (event: React.ChangeEvent<string> | string) => void;
		value: string;
	};
}) => {
	const { input } = props;
	const form = props.form ?? props.tinaForm;
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
			const id = String(data.id);
			input.onChange(id);

			const currentTitle = form?.getState?.()?.values?.title;
			if (isStarterTitle(currentTitle)) {
				form?.change?.('title', starterTitleForId(id));
			}
		} catch {
			setError('Could not assign Post ID. Retry before uploading or saving.');
			requested.current = false;
		} finally {
			setLoading(false);
		}
	}, [form, input]);

	useEffect(() => {
		if (isNumericPostId(input.value) || requested.current) {
			setLoading(false);
			return;
		}
		requested.current = true;
		void assignId();
	}, [assignId, input.value]);

	if (isNumericPostId(input.value)) {
		return null;
	}

	return (
		<div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
			{loading ? (
				<span>Setting up post…</span>
			) : (
				<div className="flex flex-col gap-2">
					<span>{error || 'Could not set up this post.'}</span>
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
