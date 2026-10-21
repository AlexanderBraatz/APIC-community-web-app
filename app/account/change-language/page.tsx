import { redirect } from 'next/navigation';
import { LanguageForm } from '@/components/account/language-form';
import {
	MANUAL_LANGUAGE_DISCLAIMER,
	parseManualLanguage
} from '@/lib/docs/manual-language';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
	searchParams: Promise<{ error?: string }>;
};

export default async function ChangeLanguagePage({ searchParams }: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in?next=/account/change-language');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('language')
		.eq('id', user.id)
		.maybeSingle();

	return (
		<main className="mx-auto w-full max-w-lg min-h-[100vh] px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">Language</h1>
			<p className="mt-2 text-sm text-[#666]">{MANUAL_LANGUAGE_DISCLAIMER}</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}

			<div className="mt-8">
				<LanguageForm
					currentLanguage={parseManualLanguage(profile?.language)}
				/>
			</div>
		</main>
	);
}
