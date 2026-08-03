import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

export default async function AccountPage() {
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	const { data: profile } = user
		? await supabase
				.from('profiles')
				.select('full_name, role, avatar_url')
				.eq('id', user.id)
				.maybeSingle()
		: { data: null };

	return (
		<main className="mx-auto w-full max-w-lg px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">Account</h1>
			<p className="mt-2 text-sm text-[#666]">
				Profile editing (avatar upload) lands in a later PR. Password changes
				use the reset flow or will be added with the full account form.
			</p>

			<dl className="mt-8 space-y-4 border-t border-[#e5e5e5] pt-6 text-sm">
				<div>
					<dt className="text-[#888]">Email</dt>
					<dd className="mt-1 text-[#444]">{user?.email ?? '—'}</dd>
				</div>
				<div>
					<dt className="text-[#888]">Name</dt>
					<dd className="mt-1 text-[#444]">{profile?.full_name || '—'}</dd>
				</div>
				<div>
					<dt className="text-[#888]">Role</dt>
					<dd className="mt-1 text-[#444]">{profile?.role ?? '—'}</dd>
				</div>
			</dl>

			<p className="mt-4 text-xs text-[#888]">
				Scheduler still uses mock login controls until attendance persistence
				(PR-03).
			</p>

			<div className="mt-8 flex flex-wrap gap-3">
				<Link
					href="/place"
					className="inline-flex h-8 items-center rounded-[2px] border border-[#634627] bg-[#805b32] px-3 text-sm font-medium text-white hover:bg-[#1f2d22]"
				>
					Members hub
				</Link>
				<form action={signOut}>
					<Button
						type="submit"
						variant="outline"
						className="rounded-[2px] border-[#634627]"
					>
						Sign out
					</Button>
				</form>
			</div>
		</main>
	);
}
