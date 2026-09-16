'use client';

import {
	CONTACT_KIND_LABELS,
	telHref,
	websiteHref,
	websiteLabel,
	whatsappHref
} from '@/lib/listings/contacts';
import { formatOpeningHoursLines } from '@/lib/listings/opening-hours';
import type { Listing } from '@/lib/listings-search';
import {
	Clock,
	Globe,
	Mail,
	Map as MapIcon,
	MapPin,
	MessageCircle,
	Phone
} from 'lucide-react';
import {
	AnalyticsEvents,
	useAnalytics
} from '@/components/analytics/posthog-provider';

function ContactIcon({ kind }: { kind: Listing['contacts'][number]['kind'] }) {
	const className = 'size-4 shrink-0 text-[#7A5A32]';
	if (kind === 'email')
		return (
			<Mail
				className={className}
				aria-hidden="true"
			/>
		);
	if (kind === 'website')
		return (
			<Globe
				className={className}
				aria-hidden="true"
			/>
		);
	if (kind === 'whatsapp')
		return (
			<MessageCircle
				className={className}
				aria-hidden="true"
			/>
		);
	return (
		<Phone
			className={className}
			aria-hidden="true"
		/>
	);
}

function contactHref(contact: Listing['contacts'][number]): string {
	switch (contact.kind) {
		case 'email':
			return `mailto:${contact.value}`;
		case 'website':
			return websiteHref(contact.value);
		case 'whatsapp':
			return whatsappHref(contact.value);
		default:
			return telHref(contact.value);
	}
}

function contactDisplay(contact: Listing['contacts'][number]): string {
	if (contact.kind === 'website') return websiteLabel(contact.value);
	return contact.value;
}

export default function ListingResultCard({ listing }: { listing: Listing }) {
	const { track } = useAnalytics();
	const hoursLines = formatOpeningHoursLines(listing.openingHours);
	const contacts = listing.contacts ?? [];
	const hasContactInfo =
		Boolean(listing.address) || hoursLines.length > 0 || contacts.length > 0;

	return (
		<article>
			<div className="space-y-8">
				<div className="space-y-3">
					{listing.type ? (
						<h3 className="font-heading text-2xl font-semibold leading-snug text-[#333333]">
							{listing.type}
						</h3>
					) : null}
					<p className="font-heading text-xl font-thin leading-snug text-[#333333]">
						{listing.name}
					</p>
				</div>

				{listing.notes ? (
					<p className="font-sans text-base leading-loose text-[#333333]">
						{listing.notes}
					</p>
				) : null}

				{hasContactInfo ? (
					<div className="space-y-3">
						{listing.address ? (
							<p className="font-sans flex items-start gap-2 text-base leading-snug text-[#333333]">
								<span className="inline-flex h-[1lh] shrink-0 items-center">
									<MapPin
										className="size-4 text-[#7A5A32]"
										aria-hidden="true"
									/>
								</span>
								<span>{listing.address}</span>
							</p>
						) : null}

						{hoursLines.length > 0 ? (
							<div className="font-sans flex items-start gap-2 text-base leading-snug text-[#333333]">
								<span className="inline-flex h-[1lh] shrink-0 items-center">
									<Clock
										className="size-4 text-[#7A5A32]"
										aria-hidden="true"
									/>
								</span>
								<div className="min-w-0 space-y-1.5">
									{hoursLines.map(line => (
										<p key={line}>{line}</p>
									))}
								</div>
							</div>
						) : null}

						{contacts.length > 0 ? (
							<ul className="space-y-2">
								{contacts.map((contact, index) => {
									const isExternal =
										contact.kind === 'website' || contact.kind === 'whatsapp';
									const label = contact.label?.trim();
									return (
										<li
											key={`${contact.kind}-${contact.value}-${index}`}
											className="font-sans flex items-center gap-2 py-1 text-base leading-none text-[#333333]"
										>
											<ContactIcon kind={contact.kind} />
											<a
												href={contactHref(contact)}
												{...(isExternal
													? { target: '_blank', rel: 'noopener noreferrer' }
													: {})}
												className="underline-offset-2 hover:underline"
												onClick={event => {
													event.stopPropagation();
													track(AnalyticsEvents.CONTACT_CLICKED, {
														category: listing.category,
														contact_kind: contact.kind
													});
												}}
											>
												{label
													? `${label}: ${contactDisplay(contact)}`
													: contact.kind === 'whatsapp' ||
														  contact.kind === 'mobile'
														? `${
																CONTACT_KIND_LABELS[contact.kind]
															}: ${contactDisplay(contact)}`
														: contactDisplay(contact)}
											</a>
										</li>
									);
								})}
							</ul>
						) : null}
					</div>
				) : null}

				{listing.sourceUrl ? (
					<p>
						<a
							href={listing.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							onClick={event => event.stopPropagation()}
							className="font-sans inline-flex items-center gap-2 rounded-[2px] border border-[#3d2a16] px-3.5 py-2 text-sm font-medium text-[#3d2a16] transition-colors duration-200 ease-in-out hover:bg-[#3d2a16] hover:text-[#f7f2ec]"
						>
							<MapIcon
								className="size-4 shrink-0"
								aria-hidden="true"
							/>
							Open in Google Maps
						</a>
					</p>
				) : null}
			</div>
		</article>
	);
}
