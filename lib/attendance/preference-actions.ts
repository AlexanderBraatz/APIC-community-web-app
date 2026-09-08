'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { EVENT_BAR_PALETTE } from './event-bar-palette';
import type { SchedulerFontSize, SchedulerPreferences } from './types';

const FONT_SIZES = new Set<SchedulerFontSize>(['small', 'medium', 'large']);

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSchedulerFontSize(value: string): value is SchedulerFontSize {
	return FONT_SIZES.has(value as SchedulerFontSize);
}

async function requireUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error || !user) {
		throw new Error('Not authenticated');
	}

	return { supabase, user };
}

async function loadOwnPreferences(
	supabase: Awaited<ReturnType<typeof createClient>>,
	userId: string
): Promise<SchedulerPreferences> {
	const { data, error } = await supabase
		.from('scheduler_preferences')
		.select('font_size, pinned_member_ids')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	const fontSize =
		data?.font_size && isSchedulerFontSize(data.font_size)
			? data.font_size
			: 'medium';

	return {
		fontSize,
		pinnedMemberIds: data?.pinned_member_ids ?? []
	};
}

export async function updateEventBarColor(color: string): Promise<void> {
	if (!(EVENT_BAR_PALETTE as readonly string[]).includes(color)) {
		throw new Error('Choose a colour from the palette.');
	}

	const { supabase, user } = await requireUser();
	const { error } = await supabase
		.from('profiles')
		.update({ event_bar_color: color })
		.eq('id', user.id);

	if (error) {
		throw new Error(error.message);
	}

	revalidatePath('/community-calendar');
}

export async function updateSchedulerPreferences(patch: {
	fontSize?: SchedulerFontSize;
	pinnedMemberIds?: string[];
}): Promise<SchedulerPreferences> {
	const { supabase, user } = await requireUser();
	const current = await loadOwnPreferences(supabase, user.id);

	const fontSize = patch.fontSize ?? current.fontSize;
	if (!isSchedulerFontSize(fontSize)) {
		throw new Error('Invalid text size.');
	}

	const pinnedMemberIds = (
		patch.pinnedMemberIds ?? current.pinnedMemberIds
	).filter(id => UUID_RE.test(id) && id !== user.id);

	const { error } = await supabase.from('scheduler_preferences').upsert(
		{
			user_id: user.id,
			font_size: fontSize,
			pinned_member_ids: pinnedMemberIds
		},
		{ onConflict: 'user_id' }
	);

	if (error) {
		throw new Error(error.message);
	}

	revalidatePath('/community-calendar');
	return { fontSize, pinnedMemberIds };
}
