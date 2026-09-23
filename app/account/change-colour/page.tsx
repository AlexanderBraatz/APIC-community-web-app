import { redirect } from 'next/navigation';
import { ProfileColorForm } from '@/components/account/profile-color-form';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
	searchParams: Promise<{ error?: string }>;
};

export default async function ChangeColourPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in?next=/account/change-colour');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('event_bar_color')
		.eq('id', user.id)
		.maybeSingle();

	return (
		<main className="mx-auto w-full max-w-lg px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Change profile colour
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				Choose the colour shown behind your profile initial and your name
				on the community calendar.
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
				<ProfileColorForm currentColor={profile?.event_bar_color ?? null} />
			</div>
		</main>
	);
}
