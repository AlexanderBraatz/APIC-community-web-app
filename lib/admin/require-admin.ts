import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error('Not authenticated');
	}

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('id, full_name, role')
		.eq('id', user.id)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	if (!profile || profile.role !== 'admin') {
		throw new Error('Admin only');
	}

	return { supabase, user, profile };
}
