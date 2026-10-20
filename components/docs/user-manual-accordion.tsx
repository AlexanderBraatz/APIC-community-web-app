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

export function UserManualAccordion({ markdown }: { markdown: string }) {
	const { title, introMarkdown, sections } = parseUserManual(markdown);

	return (
		<div className="user-manual-accordion">
			{title ? (
				<h1 className="font-heading text-4xl text-[#805b32]">{title}</h1>
			) : null}
			{introMarkdown ? (
				<div className="mt-3">
					<ManualMarkdownBody markdown={introMarkdown} />
				</div>
			) : null}

			<Accordion className="mt-8 border-t border-[#e5e5e5]">
				{sections.map((section) => {
					const sectionValue = slugifyManualHeading(section.title);
					return (
						<AccordionItem
							key={sectionValue}
							value={sectionValue}
							className="px-3 transition-colors data-open:bg-[#f3f1ed]"
						>
							<AccordionTrigger className="font-heading text-2xl text-[#805b32] hover:no-underline sm:text-3xl">
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
								<Accordion className="pl-0 sm:pl-1">
									{section.items
										.filter(
											(item) =>
												item.title.toLowerCase() !==
												'overview'
										)
										.map((item) => {
											const itemValue = `${sectionValue}--${slugifyManualHeading(item.title)}`;
											return (
												<AccordionItem
													key={itemValue}
													value={itemValue}
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
