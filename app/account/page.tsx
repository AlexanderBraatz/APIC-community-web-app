import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import { changePassword, updateFullName } from '@/lib/account/actions';
import { ProfileColorDialog } from '@/components/account/profile-color-dialog';
import { SentryDevTestButton } from '@/components/analytics/sentry-dev-test-button';
import { AccountPrivacyForm } from '@/components/privacy/account-privacy-form';
import { buttonVariants } from '@/components/ui/button-variants';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';
import { getPrivacyPreferencesForCurrentUser } from '@/lib/privacy/get-preferences';
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
	const privacyPrefs = user
		? await getPrivacyPreferencesForCurrentUser()
		: null;
	const profileCircleBg = profile?.event_bar_color ?? '#e8dfd2';
	const profileCircleTextColor = profile?.event_bar_color
		? '#ffffff'
		: '#805b32';

	return (
		<main className="mx-auto w-full max-w-lg px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">Account</h1>
			<p className="mt-2 text-sm text-[#666]">
				Update your name and profile colour, privacy preferences, change your
				password, or sign out.
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

				<form
					action={updateFullName}
					className="space-y-3"
				>
					<div className="space-y-2">
						<Label htmlFor="full_name">Full name</Label>
						<Input
							id="full_name"
							name="full_name"
							type="text"
							defaultValue={profile?.full_name ?? ''}
							maxLength={200}
							required
							autoComplete="name"
						/>
					</div>
					<SubmitButton className="w-full sm:w-auto">
						Save name
					</SubmitButton>
				</form>
			</section>

			<section className="mt-10 space-y-4 border-t border-[#e5e5e5] pt-6">
				<h2 className="text-lg font-medium text-[#444]">Profile colour</h2>
				<p className="text-sm text-[#666]">
					Choose the colour shown behind your profile initial and your
					name on the community calendar.
				</p>
				<div className="flex items-center gap-3">
					<span
						className="size-8 shrink-0 rounded-full border-2 border-[#333] shadow-sm"
						style={{ background: profileCircleBg }}
						title={profile?.event_bar_color ?? 'Default'}
						aria-label={
							profile?.event_bar_color
								? `Current profile colour ${profile.event_bar_color}`
								: 'Current profile colour default'
						}
					/>
					<ProfileColorDialog
						currentColor={profile?.event_bar_color ?? null}
					/>
				</div>
			</section>

			{privacyPrefs ? (
				<AccountPrivacyForm
					analyticsEnabled={privacyPrefs.analytics_enabled}
					sessionReplayEnabled={privacyPrefs.session_replay_enabled}
				/>
			) : null}

			<section className="mt-10 space-y-4 border-t border-[#e5e5e5] pt-6">
				<h2 className="text-lg font-medium text-[#444]">Password</h2>
				<form
					action={changePassword}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="password">New password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							autoComplete="new-password"
							minLength={8}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirm">Confirm password</Label>
						<Input
							id="confirm"
							name="confirm"
							type="password"
							autoComplete="new-password"
							minLength={8}
							required
						/>
					</div>
					<SubmitButton className="w-full sm:w-auto">
						Update password
					</SubmitButton>
				</form>
			</section>

			{/* {process.env.NODE_ENV === 'development' ? ( */}
			<SentryDevTestButton />
			{/* ) : null} */}

			<div className="mt-10 flex flex-wrap gap-3 border-t border-[#e5e5e5] pt-6">
				<Link
					href="/place"
					className={cn(
						buttonVariants({ variant: 'default' }),
						'w-full sm:w-auto'
					)}
				>
					Members hub
				</Link>
				<form action={signOut}>
					<SubmitButton variant="outline">
						Sign out
					</SubmitButton>
				</form>
			</div>
		</main>
	);
}
