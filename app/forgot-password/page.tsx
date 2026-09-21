import Link from 'next/link';
import { requestPasswordReset } from '@/app/auth/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PageProps = {
	searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
	const params = await searchParams;

	return (
		<main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Reset password</h1>
			<p className="mt-2 text-sm text-[#666]">
				Enter your email and we will send a reset link if an account exists.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}
			{params.message ? (
				<p
					className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{params.message}
				</p>
			) : null}

			<form action={requestPasswordReset} className="mt-8 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="email"
						required
					/>
				</div>
				<SubmitButton className="w-full sm:w-auto">
					Send reset link
				</SubmitButton>
			</form>

			<p className="mt-6 text-sm">
				<Link href="/sign-in" className="text-[#805b32] underline">
					Back to sign in
				</Link>
			</p>
		</main>
	);
}
