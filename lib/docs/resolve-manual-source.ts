import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
	parseManualLanguage,
	type ManualLanguage
} from '@/lib/docs/manual-language';
import type { ManualKind } from '@/lib/docs/manual-help-targets';
import { createClient } from '@/lib/supabase/server';

const MANUAL_BASE_FILES: Record<ManualKind, string> = {
	member: 'USER_MANUAL_MEMBER.md',
	admin: 'USER_MANUAL_ADMIN.md'
};

function manualFileName(kind: ManualKind, language: ManualLanguage) {
	const base = MANUAL_BASE_FILES[kind];
	if (language === 'en') return base;
	return base.replace(/\.md$/, `.${language}.md`);
}

export function resolveManualMarkdownPath(
	kind: ManualKind,
	language: ManualLanguage
) {
	return path.join(process.cwd(), 'docs', manualFileName(kind, language));
}

async function fileExists(filePath: string) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

/** Read localized manual markdown, falling back to English if missing. */
export async function readManualMarkdown(
	kind: ManualKind,
	language: ManualLanguage
) {
	const localized = resolveManualMarkdownPath(kind, language);
	if (language !== 'en' && (await fileExists(localized))) {
		return readFile(localized, 'utf8');
	}
	return readFile(resolveManualMarkdownPath(kind, 'en'), 'utf8');
}

/** Current user's manual language, or `en` when signed out / unset. */
export async function getProfileManualLanguage(): Promise<ManualLanguage> {
	const { language } = await getProfileManualHelpContext();
	return language;
}

/** Language + admin flag for the Help sheet (single profile read). */
export async function getProfileManualHelpContext(): Promise<{
	language: ManualLanguage;
	isAdmin: boolean;
}> {
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) {
		return { language: 'en', isAdmin: false };
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('language, role')
		.eq('id', user.id)
		.maybeSingle();

	return {
		language: parseManualLanguage(profile?.language),
		isAdmin: profile?.role === 'admin'
	};
}
