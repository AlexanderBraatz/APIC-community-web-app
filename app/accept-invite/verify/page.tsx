import { redirect } from 'next/navigation';
import { AcceptInviteVerifyForm } from '@/components/auth/accept-invite-verify-form';

type PageProps = {
	searchParams: Promise<{ email?: string; sent?: string }>;
};

export default async function AcceptInviteVerifyPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const email =
		typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';

	if (!email.includes('@')) {
		redirect('/accept-invite');
	}

	return (
		<AcceptInviteVerifyForm
			email={email}
			initialSent={params.sent === '1'}
		/>
	);
}
