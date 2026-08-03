import Link from 'next/link';
import { signInWithPassword } from '@/app/auth/actions';
import HashSessionRecovery from '@/components/auth/hash-session-recovery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PageProps = {
	searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const next = params.next && params.next.startsWith('/') ? params.next : '/place';

	return (
		<main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
			<HashSessionRecovery />
			<h1 className="font-heading text-3xl text-[#805b32]">Sign in</h1>
			<p className="mt-2 text-sm text-[#666]">
				Members only. There is no public registration — ask an admin for an
				invitation.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}

			<form action={signInWithPassword} className="mt-8 space-y-4">
				<input type="hidden" name="next" value={next} />
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
				<div className="space-y-2">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
					/>
				</div>
				<Button
					type="submit"
					className="w-full rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22]"
				>
					Sign in
				</Button>
			</form>

			<p className="mt-6 text-sm">
				<Link href="/forgot-password" className="text-[#805b32] underline">
					Forgot password?
				</Link>
			</p>
		</main>
	);
}
