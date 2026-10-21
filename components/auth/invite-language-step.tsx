'use client';

import { useState } from 'react';
import { setInviteLanguage } from '@/lib/invitations/actions';
import {
	MANUAL_LANGUAGE_DISCLAIMER,
	MANUAL_LANGUAGE_LABELS,
	MANUAL_LANGUAGES,
	type ManualLanguage
} from '@/lib/docs/manual-language';
import { SubmitButton } from '@/components/ui/submit-button';
import { InviteOnboardingProgress } from '@/components/auth/invite-onboarding-progress';
import { cn } from '@/lib/utils';

type Props = {
	error?: string;
	currentLanguage?: ManualLanguage | null;
};

export function InviteLanguageStep({
	error,
	currentLanguage = null
}: Props) {
	const [draft, setDraft] = useState<ManualLanguage | null>(
		currentLanguage ?? 'en'
	);

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">Language</h1>
			<p className="mt-2 text-sm text-[#666]">
				{MANUAL_LANGUAGE_DISCLAIMER}
			</p>

			{error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}

			<form action={setInviteLanguage} className="mt-8 space-y-6">
				<input type="hidden" name="language" value={draft ?? ''} />

				<div
					role="radiogroup"
					aria-label="Language"
					className="flex flex-col gap-2"
				>
					{MANUAL_LANGUAGES.map((code) => {
						const selected = draft === code;
						return (
							<button
								key={code}
								type="button"
								role="radio"
								aria-checked={selected}
								onClick={() => setDraft(code)}
								className={cn(
									'rounded-md border px-4 py-3 text-left text-sm transition-colors',
									selected
										? 'border-[#805b32] bg-[#f7f2ec] text-[#57422a]'
										: 'border-[#e5e5e5] text-[#444] hover:border-[#c4b09a]'
								)}
							>
								{MANUAL_LANGUAGE_LABELS[code]}
							</button>
						);
					})}
				</div>

				<SubmitButton className="w-full" disabled={!draft}>
					Continue
				</SubmitButton>
			</form>
			<InviteOnboardingProgress step="language" />
		</main>
	);
}
