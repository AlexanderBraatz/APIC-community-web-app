'use client';

import { PageBlocksEventListing } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';
import StarDivider from './star-divider';

const DETAIL_FIELDS = [
	{ key: 'name', label: 'Name' },
	{ key: 'date', label: 'Date' },
	{ key: 'address', label: 'Address' },
	{ key: 'contact', label: 'Contact' },
	{ key: 'notes', label: 'Notes' }
] as const;

function formatNotes(value: string) {
	return value.split(/\n{2,}/).map((paragraph, i) => (
		<span key={i}>
			{i > 0 ? <><br /><br /></> : null}
			{paragraph.trim()}
		</span>
	));
}

export default function EventListing(props: PageBlocksEventListing) {
	return (
		<section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
			<div className="mx-auto max-w-[1400px]">
				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading text-4xl font-normal text-[#333333] sm:text-5xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				<StarDivider />

				{props.events?.map((event, eventIndex) => {
					if (!event) return null;

					return (
						<article
							key={eventIndex}
							data-tina-field={tinaField(event)}
							className="pb-16 last:pb-0"
						>
							<div className="space-y-5">
								{DETAIL_FIELDS.map(({ key, label }) => {
									const value = event[key];
									if (!value) return null;

									return (
										<p
											key={key}
											className="font-heading text-lg leading-[1.75] text-[#333333]"
										>
											{label} :{' '}
											<span
												data-tina-field={tinaField(event, key)}
												className="font-normal"
											>
												{key === 'notes'
													? formatNotes(value)
													: value}
											</span>
										</p>
									);
								})}
							</div>

							{eventIndex < (props.events?.length ?? 0) - 1 ? (
								<hr className="mt-16 border-[#b8a99a]" />
							) : null}
						</article>
					);
				})}
			</div>
		</section>
	);
}
