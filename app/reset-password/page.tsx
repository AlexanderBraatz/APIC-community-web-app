import Link from 'next/link';
import { updatePassword } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PageProps = {
	searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
	const params = await searchParams;

	return (
		<main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Choose a new password</h1>
			<p className="mt-2 text-sm text-[#666]">
				Use the form below after opening the reset link from your email.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}

			<form action={updatePassword} className="mt-8 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="password">New password</Label>
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
					Save password
				</Button>
			</form>

			<p className="mt-6 text-sm">
				<Link href="/sign-in" className="text-[#805b32] underline">
					Back to sign in
				</Link>
			</p>
		</main>
	);
}
