import { createClient } from '@/lib/supabase/server';

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Non-throwing admin check for public pages that optionally show admin UI.
 * Prefer this over `requireAdmin()` when a missing session is not an error.
 */
export async function isAdmin(
	supabase?: ServerSupabase
): Promise<boolean> {
	const client = supabase ?? (await createClient());
	const {
		data: { user }
	} = await client.auth.getUser();

	if (!user) return false;

	const { data: profile } = await client
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.maybeSingle();

	return profile?.role === 'admin';
}
