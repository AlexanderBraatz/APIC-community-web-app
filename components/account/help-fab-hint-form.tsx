'use client';

import Link from 'next/link';
import { useState } from 'react';
import { updateHelpFabHintEnabled } from '@/lib/account/actions';
import { buttonVariants } from '@/components/ui/button-variants';
import { SubmitButton } from '@/components/ui/submit-button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
	enabled: boolean;
};

export function HelpFabHintForm({ enabled: initialEnabled }: Props) {
	const propsKey = String(initialEnabled);
	const [override, setOverride] = useState<boolean | null>(null);
	const [overridePropsKey, setOverridePropsKey] = useState(propsKey);

	if (overridePropsKey !== propsKey) {
		setOverridePropsKey(propsKey);
		setOverride(null);
	}

	const enabled = override ?? initialEnabled;

	return (
		<form action={updateHelpFabHintEnabled} className="space-y-6">
			<input
				type="hidden"
				name="help_fab_hint_enabled"
				value={enabled ? 'true' : 'false'}
			/>

			<div className="flex items-start justify-between gap-4">
				<div>
					<Label className="text-base text-[#444]">
						User manual reminder
					</Label>
					<p className="mt-1 text-sm text-[#666]">
						After you sign in, show a short tip pointing to the help
						button on the map pages and community calendar.
					</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={enabled}
					onClick={() => setOverride(!enabled)}
					className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
						enabled ? 'bg-[#805b32]' : 'bg-[#ccc]'
					}`}
				>
					<span
						className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white transition-transform ${
							enabled ? 'translate-x-5' : ''
						}`}
					/>
				</button>
			</div>

			<div className="flex gap-3">
				<SubmitButton className="min-w-0 flex-1">
					Save reminder preference
				</SubmitButton>
				<Link
					href="/account"
					className={cn(
						buttonVariants({ variant: 'outline' }),
						'min-w-0 flex-1'
					)}
				>
					Back to account
				</Link>
			</div>
		</form>
	);
}
