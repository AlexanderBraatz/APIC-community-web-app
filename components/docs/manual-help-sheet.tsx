'use client';

import { ArrowRight } from 'lucide-react';

import { UserManualAccordion } from '@/components/docs/user-manual-accordion';
import { Button } from '@/components/ui/button';
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle
} from '@/components/ui/sheet';
import type { ManualHelpTarget } from '@/lib/docs/manual-help-targets';

type ManualHelpSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	target: ManualHelpTarget | null;
	markdown: string | null;
	loading: boolean;
	error: string | null;
};

export function ManualHelpSheet({
	open,
	onOpenChange,
	target,
	markdown,
	loading,
	error
}: ManualHelpSheetProps) {
	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			swipeDirection="right"
			modal={false}
			disablePointerDismissal
		>
			<SheetContent showOverlay={false} showCloseButton={false}>
				<SheetHeader className="flex-row items-center justify-between gap-3 pr-5">
					<SheetTitle>Help</SheetTitle>
					<SheetClose
						render={
							<Button variant="secondary" size="sm" className="gap-1.5" />
						}
					>
						Close
						<ArrowRight className="size-3.5" aria-hidden />
					</SheetClose>
				</SheetHeader>
				<SheetBody>
					{loading ? (
						<p className="text-sm text-[#666]">Loading manual…</p>
					) : null}
					{error ? (
						<p className="text-sm text-red-700">{error}</p>
					) : null}
					{!loading && !error && markdown ? (
						<UserManualAccordion
							key={`${target?.manual ?? 'member'}-${target?.section ?? ''}-${target?.item ?? ''}`}
							markdown={markdown}
							openSection={target?.section}
							openItem={target?.item}
							manualKind={target?.manual ?? 'member'}
							compact
						/>
					) : null}
				</SheetBody>
			</SheetContent>
		</Sheet>
	);
}
