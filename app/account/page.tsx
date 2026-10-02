import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import { buttonVariants } from '@/components/ui/button-variants';
import { SubmitButton } from '@/components/ui/submit-button';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

type PageProps = {
	searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function AccountPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	const { data: profile } = user
		? await supabase
				.from('profiles')
				.select('full_name, role, event_bar_color')
				.eq('id', user.id)
				.maybeSingle()
		: { data: null };
	const profileCircleBg = profile?.event_bar_color ?? '#e8dfd2';
	const profileCircleTextColor = profile?.event_bar_color
		? '#ffffff'
		: '#805b32';

	return (
		<main className="mx-auto w-full max-w-lg min-h-[100vh] px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">Account</h1>
			<p className="mt-2 text-sm text-[#666]">
				View your profile, update settings when you need them, or sign out.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}
			{params.message ? (
				<p
					className="mt-4 border border-[#d9cbb8] bg-[#f7f2ec] px-3 py-2 text-sm text-[#57422a]"
					role="status"
				>
					{params.message}
				</p>
			) : null}

			<section className="mt-8 space-y-4 border-t border-[#e5e5e5] pt-6">
				<h2 className="text-lg font-medium text-[#444]">Profile</h2>

				<div className="flex items-center gap-4">
					<div
						className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-sm font-medium"
						aria-hidden
						style={{
							background: profileCircleBg,
							color: profileCircleTextColor
						}}
					>
						{(profile?.full_name || user?.email || '?')
							.slice(0, 1)
							.toUpperCase()}
					</div>
					<div className="min-w-0 text-sm">
						<p className="truncate text-[#444]">{profile?.full_name || '—'}</p>
						<p className="truncate text-[#888]">{user?.email ?? '—'}</p>
					</div>
				</div>

				<div>
					<dt className="sr-only">Email</dt>
					<p className="text-xs text-[#888]">Email</p>
					<p className="mt-1 text-sm text-[#444]">{user?.email ?? '—'}</p>
				</div>

				<div>
					<p className="text-xs text-[#888]">Role</p>
					<p className="mt-1 text-sm text-[#444]">{profile?.role ?? '—'}</p>
				</div>
			</section>

			<section className="mt-10 space-y-4 border-t border-[#e5e5e5] pt-6">
				<h2 className="text-lg font-medium text-[#444]">Name</h2>
				<p className="text-sm text-[#666]">
					You can change your display name at any time. Continue to a
					separate page when you are ready — the field is only shown there
					so it stays out of the way until you need it.
				</p>
				<Link
					href="/account/change-name"
					className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
				>
					Change name
				</Link>
			</section>

			<section className="mt-10 space-y-4 border-t border-[#e5e5e5] pt-6">
				<h2 className="text-lg font-medium text-[#444]">Profile colour</h2>
				<p className="text-sm text-[#666]">
					You can change the colour behind your profile initial and your
					name on the community calendar at any time. Continue when you
					are ready — the palette is only shown on the next page.
				</p>
				<Link
					href="/account/change-colour"
					className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
				>
					Change colour
				</Link>
			</section>

			<section className="mt-10 space-y-4 border-t border-[#e5e5e5] pt-6">
				<h2 className="text-lg font-medium text-[#444]">
					Privacy &amp; analytics
				</h2>
				<p className="text-sm text-[#666]">
					You can update optional usage analytics and product insights at
					any time. Continue when you want to change them — the controls
					are only shown on the next page.
				</p>
				<Link
					href="/account/privacy"
					className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
				>
					Manage privacy &amp; analytics
				</Link>
			</section>

			<section className="mt-10 space-y-4 border-t border-[#e5e5e5] pt-6">
				<h2 className="text-lg font-medium text-[#444]">Password</h2>
				<p className="text-sm text-[#666]">
					You can change your password at any time. When you are ready,
					continue to a separate page to enter a new password — the fields
					are only shown there so they stay out of the way until you need
					them.
				</p>
				<Link
					href="/account/change-password"
					className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
				>
					Change password
				</Link>
			</section>

			<div className="mt-10 flex gap-3 border-t border-[#e5e5e5] pt-6">
				<Link
					href="/place"
					className={cn(
						buttonVariants({ variant: 'default' }),
						'min-w-0 flex-1'
					)}
				>
					Members hub
				</Link>
				<form action={signOut} className="min-w-0 flex-1">
					<SubmitButton variant="outline" className="w-full">
						Sign out
					</SubmitButton>
				</form>
			</div>
		</main>
	);
}
