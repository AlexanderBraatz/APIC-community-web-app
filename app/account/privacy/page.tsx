import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccountPrivacyForm } from '@/components/privacy/account-privacy-form';
import { buttonVariants } from '@/components/ui/button-variants';
import { getPrivacyPreferencesForCurrentUser } from '@/lib/privacy/get-preferences';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

type PageProps = {
	searchParams: Promise<{ error?: string }>;
};

export default async function AccountPrivacyPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in?next=/account/privacy');
	}

	const privacyPrefs = await getPrivacyPreferencesForCurrentUser();

	if (!privacyPrefs) {
		redirect('/accept-invite?step=privacy');
	}

	return (
		<main className="mx-auto w-full max-w-lg px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Privacy &amp; analytics
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				Control optional usage analytics and product insights. Essential
				error monitoring stays on. See the{' '}
				<Link href="/privacy" className="text-[#805b32] underline">
					Privacy Policy
				</Link>{' '}
				and{' '}
				<Link href="/terms" className="text-[#805b32] underline">
					Terms &amp; Conditions
				</Link>
				.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}

			<div className="mt-8">
				<AccountPrivacyForm
					analyticsEnabled={privacyPrefs.analytics_enabled}
					sessionReplayEnabled={privacyPrefs.session_replay_enabled}
				/>
			</div>

			<p className="mt-6">
				<Link
					href="/account"
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'w-full sm:w-auto'
					)}
				>
					Back to account
				</Link>
			</p>
		</main>
	);
}
