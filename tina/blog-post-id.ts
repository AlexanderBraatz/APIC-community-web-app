export function isNumericPostId(value: unknown): value is string {
	return typeof value === 'string' && /^\d+$/.test(value);
}

export function resolveBlogPostId(
	formValues: Record<string, unknown>
): string | null {
	const fromField = formValues?.postId;
	if (isNumericPostId(fromField)) return fromField;
	if (typeof fromField === 'number' && Number.isInteger(fromField) && fromField > 0) {
		return String(fromField);
	}

	const sys = formValues?._sys as { filename?: string } | undefined;
	if (isNumericPostId(sys?.filename)) return sys.filename;

	if (isNumericPostId(formValues?.filename)) {
		return formValues.filename as string;
	}

	return null;
}
