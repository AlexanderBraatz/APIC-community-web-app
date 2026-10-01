import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getSiteOrigin } from '@/lib/site-url';

export type AuthEmailPreviewKind = 'invite' | 'recovery';

export type AuthEmailPreview = {
	kind: AuthEmailPreviewKind;
	subject: string;
	html: string;
};

const SUBJECTS: Record<AuthEmailPreviewKind, string> = {
	invite: "You're invited to join APIC",
	recovery: 'Reset your APIC password'
};

const TEMPLATE_FILES: Record<AuthEmailPreviewKind, string> = {
	invite: 'invite.html',
	recovery: 'recovery.html'
};

const SAMPLE_EMAIL = 'member@example.com';

/**
 * Substitute Go-template placeholders with safe sample values for admin preview.
 * Live Auth emails still use real SiteURL / Email / Token / RedirectTo from Supabase.
 */
function renderPreviewHtml(
	raw: string,
	siteUrl: string,
	kind: AuthEmailPreviewKind
): string {
	const sampleRedirect =
		kind === 'recovery'
			? `${siteUrl}/forgot-password/verify?email=${encodeURIComponent(SAMPLE_EMAIL)}`
			: `${siteUrl}/accept-invite/verify?email=${encodeURIComponent(SAMPLE_EMAIL)}`;
	const withVars = raw
		.replaceAll('{{ .SiteURL }}', siteUrl)
		.replaceAll('{{ .RedirectTo }}', sampleRedirect)
		.replaceAll('{{ .ConfirmationURL }}', `${siteUrl}/auth/confirm`)
		.replaceAll('{{ .Token }}', '123456')
		.replaceAll('{{ .Email }}', SAMPLE_EMAIL)
		// Preview always includes the email branch content.
		.replaceAll(/\{\{\s*if\s+\.Email\s*\}\}/g, '')
		.replaceAll(/\{\{\s*end\s*\}\}/g, '');

	return withVars;
}

function readTemplate(kind: AuthEmailPreviewKind): string {
	const filePath = path.join(
		process.cwd(),
		'supabase',
		'templates',
		TEMPLATE_FILES[kind]
	);
	return readFileSync(filePath, 'utf8');
}

export function getAuthEmailPreview(kind: AuthEmailPreviewKind): AuthEmailPreview {
	const siteUrl = getSiteOrigin();
	const raw = readTemplate(kind);
	return {
		kind,
		subject: SUBJECTS[kind],
		html: renderPreviewHtml(raw, siteUrl, kind)
	};
}

export function getAuthEmailPreviews(): AuthEmailPreview[] {
	return [
		getAuthEmailPreview('invite'),
		getAuthEmailPreview('recovery')
	];
}
