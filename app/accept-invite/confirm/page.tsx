import { redirect } from 'next/navigation';
import { AcceptInviteConfirmForm } from '@/components/auth/accept-invite-confirm-form';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
	searchParams: Promise<{
		token_hash?: string;
		type?: string;
		email?: string;
	}>;
};

export default async function AcceptInviteConfirmPage({
	searchParams
}: PageProps) {
	const params = await searchParams;
	const tokenHash =
		typeof params.token_hash === 'string' ? params.token_hash.trim() : '';
	const type = typeof params.type === 'string' ? params.type.trim() : '';
	const email =
		typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';

	// Already signed in (e.g. reused a spent magic link mid-onboarding) → resume wizard.
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (user) {
		redirect('/accept-invite');
	}

	if (!tokenHash || type !== 'invite') {
		redirect(
			email.includes('@')
				? `/accept-invite?email=${encodeURIComponent(email)}`
				: '/accept-invite'
		);
	}

	return (
		<AcceptInviteConfirmForm
			tokenHash={tokenHash}
			email={email.includes('@') ? email : ''}
		/>
	);
}
