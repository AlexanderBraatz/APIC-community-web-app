import Link from 'next/link';
import { changePassword } from '@/lib/account/actions';
import { buttonVariants } from '@/components/ui/button-variants';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type PageProps = {
	searchParams: Promise<{ error?: string }>;
};

export default async function ChangePasswordPage({ searchParams }: PageProps) {
	const params = await searchParams;

	return (
		<main className="mx-auto w-full max-w-lg min-h-[100vh] px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Change password
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				Enter a new password below, then confirm it to save the change.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}

			<form action={changePassword} className="mt-8 space-y-4">
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
				<div className="flex gap-3">
					<SubmitButton className="min-w-0 flex-1">
						Confirm change password
					</SubmitButton>
					<Link
						href="/account"
						className={cn(
							buttonVariants({ variant: 'outline' }),
							'min-w-0 flex-1'
						)}
					>
						Cancel
					</Link>
				</div>
			</form>
		</main>
	);
}
