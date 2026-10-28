'use client';

import {
	Calendar,
	Globe,
	Map,
	MapPin,
	Newspaper,
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
	type ManualSection
} from '@/lib/docs/parse-user-manual';
import type { ManualKind } from '@/lib/docs/manual-help-targets';
import { cn } from '@/lib/utils';

/** Icons for top-level manual section headings (by stable English id). */
const MANUAL_SECTION_ICONS: Record<string, LucideIcon> = {
	map: Map,
	calendar: Calendar,
	recommendations: MapPin,
	members: Users,
	'website-content': Globe,
	posts: Newspaper
};

type UserManualAccordionProps = {
	markdown: string;
	/** Top-level section id to expand, e.g. `map`. */
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
	/** Hide the H1 when an outer accordion already shows the title. */
	hideTitle?: boolean;
};

function resolveManualHash(
	sections: ManualSection[],
	hash: string
): { section: string; item?: string } | null {
	const slug = hash.replace(/^#/, '').trim();
	if (!slug) return null;

	for (const section of sections) {
		if (section.id === slug) {
			return { section: section.id };
		}
	}

	for (const section of sections) {
		for (const item of section.items) {
			const full = `${section.id}--${item.id}`;
			if (slug === item.id || slug === full) {
				return { section: section.id, item: full };
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
	manualKind,
	hideTitle = false
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
			{!hideTitle && title ? (
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
				<div
					className={cn(
						!hideTitle && title
							? compact
								? 'mt-2'
								: 'mt-3'
							: undefined
					)}
				>
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
					const SectionIcon = MANUAL_SECTION_ICONS[section.id];

					return (
						<AccordionItem
							key={section.id}
							value={section.id}
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
												item.id !== 'overview' &&
												item.title.toLowerCase() !== 'overview'
										)
										.map((item) => {
											const itemSlug = `${section.id}--${item.id}`;
											return (
												<AccordionItem
													key={itemSlug}
													value={itemSlug}
													className="px-3 transition-colors data-open:bg-[#e8e4dc]"
												>
													<AccordionTrigger className="py-3 text-lg font-medium text-[#444] hover:text-[#805b32] hover:no-underline">
														<span className="text-left">
															{item.title
																.split(
																	/<br\s*\/?>/i
																)
																.map(
																	(
																		part,
																		index
																	) => (
																		<span
																			key={`${itemSlug}-${index}`}
																		>
																			{index >
																			0 ? (
																				<br />
																			) : null}
																			{part}
																		</span>
																	)
																)}
														</span>
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
