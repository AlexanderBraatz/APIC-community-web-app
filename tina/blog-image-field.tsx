'use client';

// ImageField is exported from tinacms at runtime; types omit it.
import { ImageField } from 'tinacms';
import { isNumericPostId } from './blog-post-id';

type BlogImageFieldProps = {
	form?: {
		getFieldState?: (name: string) => { value?: unknown } | undefined;
		getState?: () => { values?: Record<string, unknown> };
	};
	field: unknown;
	input: unknown;
	meta: unknown;
};

export function BlogImageField(props: BlogImageFieldProps) {
	const postId =
		props.form?.getFieldState?.('postId')?.value ??
		props.form?.getState?.()?.values?.postId;

	if (!isNumericPostId(postId)) {
		return (
			<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
				Wait for Post ID before uploading images. Media is stored in
				images/blog/[postId]/.
			</div>
		);
	}

	const Field = ImageField as unknown as (
		fieldProps: BlogImageFieldProps
	) => React.ReactNode;

	return <Field {...props} />;
}
