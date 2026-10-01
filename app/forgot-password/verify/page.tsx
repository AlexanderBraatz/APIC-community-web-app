import { redirect } from 'next/navigation';
import { ForgotPasswordVerifyForm } from '@/components/auth/forgot-password-verify-form';

type PageProps = {
	searchParams: Promise<{ email?: string; sent?: string }>;
};

export default async function ForgotPasswordVerifyPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const email =
		typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';

	if (!email.includes('@')) {
		redirect('/forgot-password');
	}

	return (
		<ForgotPasswordVerifyForm
			email={email}
			initialSent={params.sent === '1'}
		/>
	);
}
