import { ForgotPasswordRequestForm } from '@/components/auth/forgot-password-request-form';

type PageProps = {
	searchParams: Promise<{ error?: string; email?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const initialEmail =
		typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';

	return (
		<ForgotPasswordRequestForm
			initialError={params.error}
			initialEmail={initialEmail.includes('@') ? initialEmail : ''}
		/>
	);
}
