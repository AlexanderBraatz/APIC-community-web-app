import { redirect } from 'next/navigation';
import Link from 'next/link';
import { completeInviteAcceptance } from '@/lib/invitations/actions';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

async function acceptAction(formData: FormData) {
	'use server';
	try {
		await completeInviteAcceptance(formData);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Could not set password.';
		redirect(`/accept-invite?error=${encodeURIComponent(message)}`);
	}
	redirect('/place');
}

export default async function AcceptInvitePage({
	searchParams
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const params = await searchParams;
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return (
			<main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
				<h1 className="font-heading text-3xl text-[#805b32]">Accept invitation</h1>
				<p className="mt-3 text-sm text-[#666]">
					Open the invitation link from your email to continue. If the link is
					expired, ask an admin to resend it.
				</p>
				<p className="mt-6 text-sm">
					<Link href="/sign-in" className="text-[#805b32] underline">
						Already set a password? Sign in
					</Link>
				</p>
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Choose a password</h1>
			<p className="mt-2 text-sm text-[#666]">
				Welcome{user.email ? ` (${user.email})` : ''}. Set a password to finish
				joining the community.
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
				<Button
					type="submit"
					className="w-full rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22]"
				>
					Join community
				</Button>
			</form>
		</main>
	);
}
