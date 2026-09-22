'use client';

import { useState } from 'react';
import { ArrowRight, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StyleSectionProps = {
	title: string;
	usedIn: string;
	children: React.ReactNode;
};

function StyleSection({ title, usedIn, children }: StyleSectionProps) {
	return (
		<section className="space-y-3 border-b border-[#e5e5e5] pb-8">
			<div>
				<h2 className="text-lg font-medium text-[#444]">{title}</h2>
				<p className="mt-0.5 text-xs text-[#888]">{usedIn}</p>
			</div>
			<div className="flex flex-wrap items-center gap-3">{children}</div>
		</section>
	);
}

function LoadingDemo({
	label,
	variant,
	size,
	className,
	children
}: {
	label: string;
	variant?: React.ComponentProps<typeof Button>['variant'];
	size?: React.ComponentProps<typeof Button>['size'];
	className?: string;
	children: React.ReactNode;
}) {
	const [loading, setLoading] = useState(false);

	return (
		<div className="flex flex-col gap-2">
			<p className="text-[11px] uppercase tracking-wide text-[#999]">{label}</p>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant={variant}
					size={size}
					className={className}
					loading={loading}
					onClick={() => {
						setLoading(true);
						window.setTimeout(() => setLoading(false), 1500);
					}}
				>
					{children}
				</Button>
				<span className="text-xs text-[#aaa]">click → 1.5s load</span>
			</div>
		</div>
	);
}

export default function DevButtonsPage() {
	return (
		<main className="mx-auto w-full max-w-4xl space-y-10 px-4 py-12">
			<header className="space-y-2 border-b border-[#e5e5e5] pb-6">
				<h1 className="font-heading text-3xl text-[#805b32]">
					Button style catalog
				</h1>
				<p className="text-sm text-[#666]">
					Consolidated set from{' '}
					<code className="text-xs">components/ui/button.tsx</code>: taller
					default (<code className="text-xs">h-10</code>), brand colors in CVA,
					one amber secondary. Dropped peach clear, cream/dark outline dialects,
					and ad-hoc hex overrides.
				</p>
			</header>

			<StyleSection
				title="Variants"
				usedIn="default · outline · secondary · destructive · ghost · link"
			>
				{(
					[
						'default',
						'outline',
						'secondary',
						'destructive',
						'ghost',
						'link'
					] as const
				).map(variant => (
					<LoadingDemo
						key={variant}
						label={variant}
						variant={variant}
					>
						{variant}
					</LoadingDemo>
				))}
			</StyleSection>

			<StyleSection
				title="Sizes"
				usedIn="default h-10 · sm · lg · icon (not full-width)"
			>
				{(['sm', 'default', 'lg'] as const).map(size => (
					<Button
						key={size}
						type="button"
						size={size}
					>
						{size}
					</Button>
				))}
				<Button
					type="button"
					size="icon"
					variant="secondary"
					aria-label="Icon"
				>
					<X className="size-4" />
				</Button>
			</StyleSection>

			<StyleSection
				title="Mobile full-width (CTAs / form submits only)"
				usedIn="w-full sm:w-auto — dialogs and toolbars stay auto-width"
			>
				<div className="w-full max-w-sm space-y-3 rounded-[2px] border border-dashed border-[#ccc] p-4">
					<p className="text-xs text-[#888]">Simulate narrow column</p>
					<Button
						type="button"
						className="w-full sm:w-auto"
					>
						Save changes
					</Button>
					<Button
						type="button"
						variant="outline"
						className="w-full sm:w-auto"
					>
						Cancel form
					</Button>
					<div className="flex flex-wrap gap-2 border-t border-[#eee] pt-3">
						<p className="w-full text-xs text-[#888]">Dialog / toolbar (no w-full)</p>
						<Button
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
						>
							Delete
						</Button>
					</div>
				</div>
			</StyleSection>

			<StyleSection
				title="Wide CTA + arrow"
				usedIn="cta-section, button-list, admin recommendations — size=lg + w-full sm:w-72"
			>
				<Button
					type="button"
					size="lg"
					className={cn(
						'group w-full justify-between sm:w-72'
					)}
				>
					<span>Explore members</span>
					<ArrowRight className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
				</Button>
			</StyleSection>

			<StyleSection
				title="Secondary with icons"
				usedIn="Suggest again, Edit pencil, remove X — same amber secondary"
			>
				<LoadingDemo
					label="suggest"
					variant="secondary"
				>
					Suggest again
					<RotateCcw className="size-4" aria-hidden />
				</LoadingDemo>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					className="gap-1.5"
				>
					Edit
				</Button>
				<Button
					type="button"
					variant="secondary"
					size="icon"
					aria-label="Remove"
				>
					<X className="size-4" />
				</Button>
			</StyleSection>

			<p className="pb-12 text-xs text-[#999]">
				Public catalog at <code>/dev/buttons</code> — not linked from nav. Chips,
				switches, and scheduler overlay controls are out of scope.
			</p>
		</main>
	);
}
