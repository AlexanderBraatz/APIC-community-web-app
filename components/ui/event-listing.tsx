'use client';

import { PageBlocksEventListing } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';

const DETAIL_FIELDS = [
	{ key: 'name', label: 'Name' },
	{ key: 'date', label: 'Date' },
	{ key: 'address', label: 'Address' },
	{ key: 'contact', label: 'Contact' },
	{ key: 'notes', label: 'Notes' }
] as const;

function DividerWithStar() {
	return (
		<div
			className="my-10 flex items-center gap-0"
			aria-hidden="true"
		>
			<div className="h-px flex-1 bg-[#b8a99a]" />
			<svg
				viewBox="0 0 24 24"
				className="mx-3 size-3 shrink-0 fill-[#c41e3a]"
			>
				<path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
			</svg>
			<div className="h-px flex-1 bg-[#b8a99a]" />
		</div>
	);
}

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

				<DividerWithStar />

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

							{event.images && event.images.length > 0 ? (
								<div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{event.images.map((item, imageIndex) => {
										if (!item?.image) return null;

										return (
											<div
												key={imageIndex}
												className="overflow-hidden"
												data-tina-field={tinaField(item)}
											>
												<img
													src={item.image}
													alt=""
													className="size-full object-cover"
													data-tina-field={tinaField(item, 'image')}
												/>
											</div>
										);
									})}
								</div>
							) : null}

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
