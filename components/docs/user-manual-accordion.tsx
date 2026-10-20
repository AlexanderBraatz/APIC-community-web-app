'use client';

import { ManualMarkdownBody } from '@/components/docs/manual-markdown-body';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '@/components/ui/accordion';
import {
	parseUserManual,
	slugifyManualHeading
} from '@/lib/docs/parse-user-manual';
import { cn } from '@/lib/utils';

type UserManualAccordionProps = {
	markdown: string;
	/** Top-level section slug to expand, e.g. `map`. */
	openSection?: string;
	/** Nested howto value to expand, e.g. `map--find-recommendations`. */
	openItem?: string;
	/** Compact typography for the help sheet. */
	compact?: boolean;
};

export function UserManualAccordion({
	markdown,
	openSection,
	openItem,
	compact = false
}: UserManualAccordionProps) {
	const { title, introMarkdown, sections } = parseUserManual(markdown);
	const sectionDefault = openSection ? [openSection] : [];

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
					<ManualMarkdownBody markdown={introMarkdown} />
				</div>
			) : null}

			<Accordion
				className={cn(
					'border-t border-[#e5e5e5]',
					compact ? 'mt-4' : 'mt-8'
				)}
				defaultValue={sectionDefault}
			>
				{sections.map((section) => {
					const sectionSlug = slugifyManualHeading(section.title);
					const itemDefault =
						openItem && openSection === sectionSlug
							? [openItem]
							: [];

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
								{section.title}
							</AccordionTrigger>
							<AccordionContent>
								{section.preambleMarkdown ? (
									<div className="mb-2">
										<ManualMarkdownBody
											markdown={section.preambleMarkdown}
										/>
									</div>
								) : null}
								<Accordion
									className="pl-0 sm:pl-1"
									defaultValue={itemDefault}
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
