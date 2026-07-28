'use client';

import { PageBlocksAboutSection } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';

export default function AboutSection(props: PageBlocksAboutSection) {
	return (
		<section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
			<div className="mx-auto max-w-[1400px]">
				{props.sectionTitle ? (
					<h2
						data-tina-field={tinaField(props, 'sectionTitle')}
						className="font-heading mb-10 text-center text-3xl font-normal text-[#333333] sm:text-4xl"
					>
						{props.sectionTitle}
					</h2>
				) : null}

				{props.paragraphs && props.paragraphs.length > 0 ? (
					<div className="mx-auto mb-16 max-w-4xl space-y-5">
						{props.paragraphs.map((paragraph, i) => {
							if (!paragraph?.text) return null;

							return (
								<p
									key={i}
									data-tina-field={tinaField(paragraph, 'text')}
									className="font-heading text-left text-lg leading-[1.75] text-[#333333]"
								>
									{paragraph.text}
								</p>
							);
						})}
					</div>
				) : null}

				{props.members && props.members.length > 0 ? (
					<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{props.members.map((member, i) => {
							if (!member?.name) return null;

							return (
								<article
									key={i}
									data-tina-field={tinaField(member)}
									className="flex flex-col text-center"
								>
									{member.image ? (
										<div className="relative mx-auto aspect-[440/330] w-full max-w-[440px] overflow-hidden bg-[#f8f6f2]">
											<img
												src={member.image}
												alt=""
												className="absolute inset-0 size-full object-cover object-[center_20%]"
												data-tina-field={tinaField(member, 'image')}
											/>
										</div>
									) : (
										<div className="mx-auto aspect-[440/330] w-full max-w-[440px] bg-[#f8f6f2]" />
									)}
									<h3
										data-tina-field={tinaField(member, 'name')}
										className="font-heading mt-4 text-xl font-normal text-[#333333]"
									>
										{member.name}
									</h3>
								</article>
							);
						})}
					</div>
				) : null}
			</div>
		</section>
	);
}
