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
 * Live Auth emails still use real ConfirmationURL / SiteURL / Email from Supabase.
 */
function renderPreviewHtml(raw: string, siteUrl: string): string {
	const withVars = raw
		.replaceAll('{{ .SiteURL }}', siteUrl)
		.replaceAll('{{ .ConfirmationURL }}', '#')
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
		html: renderPreviewHtml(raw, siteUrl)
	};
}

export function getAuthEmailPreviews(): AuthEmailPreview[] {
	return [
		getAuthEmailPreview('invite'),
		getAuthEmailPreview('recovery')
	];
}
