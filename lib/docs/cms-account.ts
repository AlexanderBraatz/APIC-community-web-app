const EMAIL_PLACEHOLDER = '{{CMS_ACCOUNT_EMAIL}}';
const PASSWORD_PLACEHOLDER = '{{CMS_ACCOUNT_PASSWORD}}';

function trimEnv(value: string | undefined) {
	return value?.trim() || '';
}

/** Replace CMS account placeholders in admin manual markdown. */
export function injectCmsAccountPlaceholders(
	markdown: string,
	options?: { email?: string; password?: string }
) {
	const email =
		(options?.email ?? trimEnv(process.env.CMS_ACCOUNT_EMAIL)) || '—';
	const password =
		(options?.password ?? trimEnv(process.env.CMS_ACCOUNT_PASSWORD)) || '—';

	return markdown
		.replaceAll(EMAIL_PLACEHOLDER, email)
		.replaceAll(PASSWORD_PLACEHOLDER, password);
}
