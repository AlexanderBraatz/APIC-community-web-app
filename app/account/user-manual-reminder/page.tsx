import { redirect } from 'next/navigation';
import { HelpFabHintForm } from '@/components/account/help-fab-hint-form';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
	searchParams: Promise<{ error?: string }>;
};

export default async function UserManualReminderPage({
	searchParams
}: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in?next=/account/user-manual-reminder');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('help_fab_hint_enabled')
		.eq('id', user.id)
		.maybeSingle();

	return (
		<main className="mx-auto w-full max-w-lg min-h-[100vh] px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">
				User manual reminder
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				Control whether a short tip points to the help button after you
				sign in. Turn it off if you find it annoying — you can turn it
				back on anytime.
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
				<HelpFabHintForm
					enabled={profile?.help_fab_hint_enabled !== false}
				/>
			</div>
		</main>
	);
}
