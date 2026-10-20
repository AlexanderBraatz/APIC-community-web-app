'use client';

import {
	Boxes,
	Calendar,
	Globe,
	Map,
	MapPin,
	Newspaper,
	Sparkles,
	Users,
	type LucideIcon
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { ManualMarkdownBody } from '@/components/docs/manual-markdown-body';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '@/components/ui/accordion';
import {
	parseUserManual,
	slugifyManualHeading,
	type ManualSection
} from '@/lib/docs/parse-user-manual';
import type { ManualKind } from '@/lib/docs/manual-help-targets';
import { cn } from '@/lib/utils';

/** Icons for top-level manual section headings (by slug). */
const MANUAL_SECTION_ICONS: Record<string, LucideIcon> = {
	map: Map,
	calendar: Calendar,
	recommendations: MapPin,
	members: Users,
	'website-content': Globe,
	posts: Newspaper,
	'working-with-blocks': Boxes,
	'special-blocks': Sparkles
};

type UserManualAccordionProps = {
	markdown: string;
	/** Top-level section slug to expand, e.g. `map`. */
	openSection?: string;
	/** Nested howto value to expand, e.g. `map--find-recommendations`. */
	openItem?: string;
	/** Controlled top-level accordion values (sheet session persistence). */
	sectionValue?: string[];
	onSectionValueChange?: (value: string[]) => void;
	/** Controlled nested accordion values (sheet session persistence). */
	itemValue?: string[];
	onItemValueChange?: (value: string[]) => void;
	/** Compact typography for the help sheet. */
	compact?: boolean;
	/** Which manual is shown; drives mobile screenshot behavior in the sheet. */
	manualKind?: ManualKind;
};

function resolveManualHash(
	sections: ManualSection[],
	hash: string
): { section: string; item?: string } | null {
	const slug = hash.replace(/^#/, '').trim();
	if (!slug) return null;

	for (const section of sections) {
		const sectionSlug = slugifyManualHeading(section.title);
		if (sectionSlug === slug) {
			return { section: sectionSlug };
		}
	}

	for (const section of sections) {
		const sectionSlug = slugifyManualHeading(section.title);
		for (const item of section.items) {
			const itemPart = slugifyManualHeading(item.title);
			const full = `${sectionSlug}--${itemPart}`;
			if (slug === itemPart || slug === full) {
				return { section: sectionSlug, item: full };
			}
		}
	}

	return null;
}

export function UserManualAccordion({
	markdown,
	openSection,
	openItem,
	sectionValue: sectionValueProp,
	onSectionValueChange,
	itemValue: itemValueProp,
	onItemValueChange,
	compact = false,
	manualKind
}: UserManualAccordionProps) {
	const { title, introMarkdown, sections } = parseUserManual(markdown);
	const [uncontrolledSectionValue, setUncontrolledSectionValue] = useState<
		string[]
	>(openSection ? [openSection] : []);
	const [uncontrolledItemValue, setUncontrolledItemValue] = useState<string[]>(
		openItem ? [openItem] : []
	);

	const sectionControlled = onSectionValueChange !== undefined;
	const itemControlled = onItemValueChange !== undefined;
	const sectionValue = sectionControlled
		? (sectionValueProp ?? [])
		: uncontrolledSectionValue;
	const itemValue = itemControlled
		? (itemValueProp ?? [])
		: uncontrolledItemValue;
	const setSectionValue = sectionControlled
		? onSectionValueChange
		: setUncontrolledSectionValue;
	const setItemValue = itemControlled
		? onItemValueChange
		: setUncontrolledItemValue;

	const onHashNavigate = useCallback(
		(hash: string) => {
			const resolved = resolveManualHash(sections, hash);
			if (!resolved) return;
			setSectionValue([resolved.section]);
			setItemValue(resolved.item ? [resolved.item] : []);
		},
		[sections, setSectionValue, setItemValue]
	);

	const hashNavigate = compact ? onHashNavigate : undefined;

	return (
		<div className="user-manual-accordion">
			{title ? (
				<h1
					className={cn(
						'font-heading text-[#805b32]',
						compact ? 'text-2xl' : 'text-4xl'
					)}
				>
					{title}
				</h1>
			) : null}
			{introMarkdown ? (
				<div className={cn(compact ? 'mt-2' : 'mt-3')}>
					<ManualMarkdownBody
						markdown={introMarkdown}
						compact={compact}
						manualKind={manualKind}
						onHashNavigate={hashNavigate}
					/>
				</div>
			) : null}

			<Accordion
				className={cn(
					'border-t border-[#e5e5e5]',
					compact ? 'mt-4' : 'mt-8'
				)}
				value={sectionValue}
				onValueChange={setSectionValue}
			>
				{sections.map((section) => {
					const sectionSlug = slugifyManualHeading(section.title);
					const SectionIcon = MANUAL_SECTION_ICONS[sectionSlug];

					return (
						<AccordionItem
							key={sectionSlug}
							value={sectionSlug}
							className="px-3 transition-colors data-open:bg-[#f3f1ed]"
						>
							<AccordionTrigger
								className={cn(
									'font-heading text-[#805b32] hover:no-underline',
									compact
										? 'text-xl'
										: 'text-2xl sm:text-3xl'
								)}
							>
								<span className="flex min-w-0 items-center gap-2.5">
									{SectionIcon ? (
										<SectionIcon
											aria-hidden
											className={cn(
												'shrink-0 text-[#805b32]',
												compact ? 'size-5' : 'size-6 sm:size-7'
											)}
										/>
									) : null}
									<span className="min-w-0">{section.title}</span>
								</span>
							</AccordionTrigger>
							<AccordionContent>
								{section.preambleMarkdown ? (
									<div className="mb-2">
										<ManualMarkdownBody
											markdown={section.preambleMarkdown}
											compact={compact}
											manualKind={manualKind}
											onHashNavigate={hashNavigate}
										/>
									</div>
								) : null}
								<Accordion
									className="pl-0 sm:pl-1"
									value={itemValue}
									onValueChange={setItemValue}
								>
									{section.items
										.filter(
											(item) =>
												item.title.toLowerCase() !==
												'overview'
										)
										.map((item) => {
											const itemSlug = `${sectionSlug}--${slugifyManualHeading(item.title)}`;
											return (
												<AccordionItem
													key={itemSlug}
													value={itemSlug}
													className="px-3 transition-colors data-open:bg-[#e8e4dc]"
												>
													<AccordionTrigger className="py-3 text-lg font-medium text-[#444] hover:text-[#805b32] hover:no-underline">
														{item.title}
													</AccordionTrigger>
													<AccordionContent>
														<ManualMarkdownBody
															markdown={
																item.bodyMarkdown
															}
															compact={compact}
															manualKind={
																manualKind
															}
															onHashNavigate={
																hashNavigate
															}
														/>
													</AccordionContent>
												</AccordionItem>
											);
										})}
								</Accordion>
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}
