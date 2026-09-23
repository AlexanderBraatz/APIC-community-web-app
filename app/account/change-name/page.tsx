import Link from 'next/link';
import { updateFullName } from '@/lib/account/actions';
import { buttonVariants } from '@/components/ui/button-variants';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { redirect } from 'next/navigation';

type PageProps = {
	searchParams: Promise<{ error?: string }>;
};

export default async function ChangeNamePage({ searchParams }: PageProps) {
	const params = await searchParams;
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in?next=/account/change-name');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name')
		.eq('id', user.id)
		.maybeSingle();

	return (
		<main className="mx-auto w-full max-w-lg px-4 py-12">
			<h1 className="font-heading text-3xl text-[#805b32]">Change name</h1>
			<p className="mt-2 text-sm text-[#666]">
				Update the name shown on your profile and on the community calendar.
			</p>

			{params.error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{params.error}
				</p>
			) : null}

			<form action={updateFullName} className="mt-8 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="full_name">Full name</Label>
					<Input
						id="full_name"
						name="full_name"
						type="text"
						defaultValue={profile?.full_name ?? ''}
						maxLength={200}
						required
						autoComplete="name"
					/>
				</div>
				<div className="flex flex-wrap gap-3">
					<SubmitButton className="w-full sm:w-auto">
						Confirm change name
					</SubmitButton>
					<Link
						href="/account"
						className={cn(
							buttonVariants({ variant: 'outline' }),
							'w-full sm:w-auto'
						)}
					>
						Cancel
					</Link>
				</div>
			</form>
		</main>
	);
}
