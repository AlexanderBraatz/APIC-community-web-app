export function getSupabaseEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!url) {
		throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
	}
	if (!key) {
		throw new Error(
			'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)'
		);
	}

	return { url, key };
}
