'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

type NotificationStepProps = {
	heading: string;
	paragraph: string;
	sourceIcon: ReactNode;
	sourceLabel: string;
	items?: string[];
};

export default function NotificationStep({
	heading,
	paragraph,
	sourceIcon,
	sourceLabel,
	items
}: NotificationStepProps) {
	return (
		<section className="mx-auto flex max-w-lg flex-col items-center gap-8 py-6 text-center">
			<div className="flex items-center gap-4">
				<span
					className="flex size-12 items-center justify-center"
					aria-label={sourceLabel}
				>
					{sourceIcon}
				</span>
				<ArrowRight
					className="size-5 text-[#888]"
					aria-hidden
				/>
				<span
					className="relative flex h-12 w-28 items-center justify-center"
					aria-label="APIC"
				>
					<Image
						src="/images/apic_community_logo_cropped.png"
						alt="APIC"
						width={112}
						height={48}
						className="h-10 w-auto object-contain"
					/>
				</span>
			</div>

			<div className="space-y-3">
				<h2 className="text-xl font-medium tracking-tight text-[#2c2c2c]">
					{heading}
				</h2>
				<p className="text-sm leading-relaxed text-[#666]">{paragraph}</p>
			</div>

			{items && items.length > 0 ? (
				<ul className="w-full space-y-1.5 text-left text-sm text-[#444]">
					{items.map(item => (
						<li
							key={item}
							className="border-b border-[#e8e0d6] py-1.5 last:border-b-0"
						>
							{item}
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
