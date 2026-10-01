import { redirect } from 'next/navigation';
import { completeInviteAcceptance } from '@/lib/invitations/actions';
import { createClient } from '@/lib/supabase/server';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InvitePrivacyStep } from '@/components/privacy/invite-privacy-step';
import { AcceptInviteOtpForm } from '@/components/auth/accept-invite-otp-form';

async function acceptAction(formData: FormData) {
	'use server';
	try {
		await completeInviteAcceptance(formData);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Could not set password.';
		redirect(`/accept-invite?error=${encodeURIComponent(message)}`);
	}
	redirect('/accept-invite?step=privacy');
}

export default async function AcceptInvitePage({
	searchParams
}: {
	searchParams: Promise<{ error?: string; step?: string; email?: string }>;
}) {
	const params = await searchParams;
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		const initialEmail =
			typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
		return (
			<AcceptInviteOtpForm
				initialError={params.error}
				initialEmail={initialEmail.includes('@') ? initialEmail : ''}
			/>
		);
	}

	const { data: prefs } = await supabase
		.from('privacy_preferences')
		.select('user_id')
		.eq('user_id', user.id)
		.maybeSingle();

	if (prefs) {
		redirect('/place');
	}

	if (params.step === 'privacy') {
		return <InvitePrivacyStep error={params.error} />;
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name')
		.eq('id', user.id)
		.maybeSingle();

	const defaultName =
		profile?.full_name && profile.full_name !== 'Member'
			? profile.full_name
			: '';

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Join APIC</h1>
			<p className="mt-2 text-sm text-[#666]">
				APIC — Associazione Proprietari Castelfalfi. Welcome
				{user.email ? ` (${user.email})` : ''}. Set your shown name and password
				to finish joining.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}

			<form action={acceptAction} className="mt-8 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="full_name">Shown name</Label>
					<Input
						id="full_name"
						name="full_name"
						type="text"
						autoComplete="name"
						maxLength={200}
						required
						defaultValue={defaultName}
					/>
					<p className="text-xs text-[#666]">
						This is the name other members will see.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="password">Password</Label>
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
					Continue
				</SubmitButton>
			</form>
		</main>
	);
}
