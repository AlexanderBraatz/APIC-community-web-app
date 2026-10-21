'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateLanguage } from '@/lib/account/actions';
import {
	MANUAL_LANGUAGE_LABELS,
	MANUAL_LANGUAGES,
	type ManualLanguage
} from '@/lib/docs/manual-language';
import { buttonVariants } from '@/components/ui/button-variants';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/utils';

type Props = {
	currentLanguage: ManualLanguage;
};

export function LanguageForm({ currentLanguage }: Props) {
	const [draft, setDraft] = useState<ManualLanguage>(currentLanguage);

	return (
		<form action={updateLanguage} className="space-y-6">
			<input type="hidden" name="language" value={draft} />

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

			<div className="flex gap-3">
				<SubmitButton
					className="min-w-0 flex-1"
					disabled={draft === currentLanguage}
				>
					Save language
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
	);
}
