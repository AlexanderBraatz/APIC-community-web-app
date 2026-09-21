'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/require-admin';
import { generateAliasesForTags } from '@/lib/listings/tag-suggest-actions';
import {
	dedupeAliases,
	normalizeLabel,
	tagKey
} from '@/lib/listings/tag-resolution';
import type { Json } from '@/lib/supabase/database.types';

export type AdminTagRow = {
	id: string;
	name: string;
	aliases: string[];
};

async function writeTagAudit(
	supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
	payload: {
		action: string;
		targetId: string;
		summary: string;
		oldValues?: Record<string, unknown> | null;
		newValues?: Record<string, unknown> | null;
	}
) {
	const { error } = await supabase.rpc('write_admin_audit', {
		p_action: payload.action,
		p_target_type: 'tag',
		p_target_id: payload.targetId,
		p_summary: payload.summary,
		p_old_values: (payload.oldValues ?? null) as Json | null,
		p_new_values: (payload.newValues ?? null) as Json | null
	});
	if (error) throw new Error(error.message);
}

function revalidateTagPaths() {
	revalidatePath('/members/admin/tags');
	revalidatePath('/members/admin/listings');
	revalidatePath('/members/admin/audit-log');
	for (const slug of [
		'food-dining',
		'services-maintenance',
		'health-wellness',
		'shop-market'
	]) {
		revalidatePath(`/${slug}`);
	}
}

export async function listAdminTags(): Promise<AdminTagRow[]> {
	const { supabase } = await requireAdmin();
	const { data, error } = await supabase
		.from('listing_tags')
		.select('id, name, aliases')
		.order('name', { ascending: true });
	if (error) throw new Error(error.message);
	return (data ?? []).map(row => ({
		id: row.id,
		name: row.name,
		aliases: Array.isArray(row.aliases) ? row.aliases : []
	}));
}

export async function updateTag(
	id: string,
	input: { name: string; aliases: string[] }
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase } = await requireAdmin();
		const name = normalizeLabel(input.name);
		if (!name) return { ok: false, error: 'Name is required.' };
		if (name.length > 100) {
			return { ok: false, error: 'Name must be 100 characters or fewer.' };
		}

		const { data: existing, error: loadError } = await supabase
			.from('listing_tags')
			.select('id, name, aliases')
			.eq('id', id)
			.maybeSingle();
		if (loadError) return { ok: false, error: loadError.message };
		if (!existing) return { ok: false, error: 'Keyword not found.' };

		const aliases = dedupeAliases(input.aliases).filter(
			alias => tagKey(alias) !== tagKey(name)
		);

		const { error } = await supabase
			.from('listing_tags')
			.update({ name, aliases })
			.eq('id', id);
		if (error) return { ok: false, error: error.message };

		await writeTagAudit(supabase, {
			action: 'tag.update',
			targetId: id,
			summary: `Updated keyword “${name}”`,
			oldValues: {
				name: existing.name,
				aliases: existing.aliases
			},
			newValues: { name, aliases }
		});
		revalidateTagPaths();
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Update failed.'
		};
	}
}

export async function deleteTag(
	id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const { supabase } = await requireAdmin();
		const { data: existing, error: loadError } = await supabase
			.from('listing_tags')
			.select('id, name, aliases')
			.eq('id', id)
			.maybeSingle();
		if (loadError) return { ok: false, error: loadError.message };
		if (!existing) return { ok: false, error: 'Keyword not found.' };

		const { error } = await supabase.from('listing_tags').delete().eq('id', id);
		if (error) return { ok: false, error: error.message };

		await writeTagAudit(supabase, {
			action: 'tag.delete',
			targetId: id,
			summary: `Deleted keyword “${existing.name}”`,
			oldValues: {
				name: existing.name,
				aliases: existing.aliases
			}
		});
		revalidateTagPaths();
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Delete failed.'
		};
	}
}

export async function fillMissingAliases(): Promise<
	| { ok: true; filled: number; scanned: number }
	| { ok: false; error: string }
> {
	try {
		const { supabase } = await requireAdmin();
		const { data, error } = await supabase
			.from('listing_tags')
			.select('name, aliases')
			.order('name', { ascending: true });
		if (error) return { ok: false, error: error.message };

		const empty = (data ?? [])
			.filter(row => !Array.isArray(row.aliases) || row.aliases.length === 0)
			.map(row => row.name);

		if (empty.length === 0) {
			return { ok: true, filled: 0, scanned: data?.length ?? 0 };
		}

		// Process in chunks to keep OpenAI payloads reasonable.
		let filled = 0;
		const chunkSize = 25;
		for (let i = 0; i < empty.length; i += chunkSize) {
			const chunk = empty.slice(i, i + chunkSize);
			const result = await generateAliasesForTags(chunk);
			if (!result.ok) return { ok: false, error: result.error };
			filled += result.updated;
		}

		revalidateTagPaths();
		return { ok: true, filled, scanned: empty.length };
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error ? error.message : 'Fill missing aliases failed.'
		};
	}
}
