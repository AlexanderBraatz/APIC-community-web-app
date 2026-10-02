import { redirect } from 'next/navigation';
import {
	setInvitePassword,
	setInviteShownName
} from '@/lib/invitations/actions';
import { resolveInviteFlowStep } from '@/lib/invitations/onboarding';
import { createClient } from '@/lib/supabase/server';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InvitePrivacyStep } from '@/components/privacy/invite-privacy-step';
import { AcceptInviteRequestForm } from '@/components/auth/accept-invite-request-form';
import { InviteColourStep } from '@/components/auth/invite-colour-step';
import { InviteFavoritesStep } from '@/components/auth/invite-favorites-step';

async function passwordAction(formData: FormData) {
	'use server';
	try {
		await setInvitePassword(formData);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Could not set password.';
		redirect(
			`/accept-invite?step=password&error=${encodeURIComponent(message)}`
		);
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
			<AcceptInviteRequestForm
				initialError={params.error}
				initialEmail={initialEmail.includes('@') ? initialEmail : ''}
			/>
		);
	}

	const flowStep = await resolveInviteFlowStep(user);

	if (flowStep === 'done') {
		redirect('/place');
	}

	const requestedStep =
		typeof params.step === 'string' ? params.step : undefined;

	if (requestedStep && requestedStep !== flowStep) {
		redirect(`/accept-invite?step=${flowStep}`);
	}

	const activeStep = flowStep;

	if (activeStep === 'privacy') {
		return <InvitePrivacyStep error={params.error} />;
	}

	if (activeStep === 'name') {
		return (
			<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
				<h1 className="font-heading text-3xl text-[#805b32]">
					Your shown name
				</h1>
				<p className="mt-2 text-sm text-[#666]">
					This is the name other members will see on the calendar and around the
					community.
				</p>

				{params.error ? (
					<p
						className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
						role="alert"
					>
						{params.error}
					</p>
				) : null}

				<form
					action={setInviteShownName}
					className="mt-8 space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="full_name">Shown name</Label>
						<Input
							id="full_name"
							name="full_name"
							type="text"
							autoComplete="name"
							maxLength={200}
							required
						/>
					</div>
					<SubmitButton className="w-full">Continue</SubmitButton>
				</form>
			</main>
		);
	}

	if (activeStep === 'colour') {
		const { data: profile } = await supabase
			.from('profiles')
			.select('event_bar_color')
			.eq('id', user.id)
			.maybeSingle();

		return (
			<InviteColourStep
				error={params.error}
				currentColor={profile?.event_bar_color ?? null}
			/>
		);
	}

	if (activeStep === 'favorites') {
		const { data: members } = await supabase
			.from('profiles')
			.select('id, full_name')
			.order('full_name', { ascending: true });

		return (
			<InviteFavoritesStep
				error={params.error}
				members={members ?? []}
				currentUserId={user.id}
			/>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Set your password
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				Welcome
				{user.email ? ` (${user.email})` : ''}. Choose a password to continue
				joining.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}

			<form
				action={passwordAction}
				className="mt-8 space-y-4"
			>
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
				<SubmitButton className="w-full">Continue</SubmitButton>
			</form>
		</main>
	);
}
