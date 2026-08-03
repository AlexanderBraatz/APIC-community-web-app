import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminNavLink() {
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return null;
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.maybeSingle();

	if (profile?.role !== 'admin') {
		return null;
	}

	return (
		<p className="mx-auto max-w-[1600px] px-4 py-2 text-sm sm:px-6 lg:px-10">
			<Link
				href="/members/admin/invitations"
				className="text-[#805b32] underline"
			>
				Admin · Invitations
			</Link>
		</p>
	);
}
