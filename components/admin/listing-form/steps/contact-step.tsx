'use client';

import OpeningHoursEditor from '@/components/admin/listing-form/opening-hours-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	CONTACT_KIND_LABELS,
	CONTACT_KINDS,
	isContactKind,
	newContactFormRow,
	sortByContactKind,
	type ContactFormRow,
	type ContactKind
} from '@/lib/listings/contacts';
import {
	openingHoursToFormState,
	type OpeningHoursFormState
} from '@/lib/listings/opening-hours';
import { X } from 'lucide-react';

type ContactStepProps = {
	contacts: ContactFormRow[];
	hours: OpeningHoursFormState;
	showHours: boolean;
	onContactsChange: (contacts: ContactFormRow[]) => void;
	onHoursChange: (hours: OpeningHoursFormState) => void;
	onShowHoursChange: (show: boolean) => void;
};

export default function ContactStep({
	contacts,
	hours,
	showHours,
	onContactsChange,
	onHoursChange,
	onShowHoursChange
}: ContactStepProps) {
	function handleOpeningHoursToggle() {
		if (showHours) {
			onHoursChange(openingHoursToFormState(null));
			onShowHoursChange(false);
			return;
		}
		onShowHoursChange(true);
	}

	return (
		<section className="space-y-8">
			<div className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-medium text-[#444]">Contact info</h3>
						<p className="text-xs text-[#888]">
							Add phone, mobile, WhatsApp, email, or website. Optional label
							for roles (e.g. Reservations).
						</p>
					</div>
					<Button
						type="button"
						variant="secondary"
						onClick={() =>
							onContactsChange(
								sortByContactKind([...contacts, newContactFormRow()])
							)
						}
					>
						Add contact info
					</Button>
				</div>
				{contacts.length === 0 ? (
					<p className="text-xs text-[#999]">
						No contact info yet — add one, or fill via business lookup.
					</p>
				) : (
					<ul className="space-y-5 sm:space-y-2">
						{contacts.map(row => (
							<li
								key={row.key}
								className="grid gap-2 py-1 sm:py-0 sm:grid-cols-[8.5rem_minmax(0,7rem)_1fr_auto]"
							>
								<select
									aria-label="Contact kind"
									value={row.kind}
									onChange={e => {
										const kind = e.target.value;
										if (!isContactKind(kind)) return;
										onContactsChange(
											sortByContactKind(
												contacts.map(c =>
													c.key === row.key
														? { ...c, kind: kind as ContactKind }
														: c
												)
											)
										);
									}}
									className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
								>
									{CONTACT_KINDS.map(kind => (
										<option
											key={kind}
											value={kind}
										>
											{CONTACT_KIND_LABELS[kind]}
										</option>
									))}
								</select>
								<Input
									aria-label="Contact label"
									placeholder="Label"
									value={row.label}
									onChange={e =>
										onContactsChange(
											contacts.map(c =>
												c.key === row.key
													? { ...c, label: e.target.value }
													: c
											)
										)
									}
								/>
								<Input
									aria-label="Contact value"
									placeholder={
										row.kind === 'email'
											? 'name@example.com'
											: row.kind === 'website'
												? 'https://'
												: '+39 …'
									}
									type={row.kind === 'email' ? 'email' : 'text'}
									value={row.value}
									onChange={e =>
										onContactsChange(
											contacts.map(c =>
												c.key === row.key
													? { ...c, value: e.target.value }
													: c
											)
										)
									}
								/>
								<Button
									type="button"
									size="icon"
									variant="secondary"
									aria-label="Remove contact info"
									onClick={() =>
										onContactsChange(contacts.filter(c => c.key !== row.key))
									}
								>
									<X className="size-4" />
								</Button>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-medium text-[#444]">Opening hours</h3>
						<p className="text-xs text-[#888]">
							{showHours
								? 'Optional weekly schedule for this listing.'
								: 'Optional — expand to edit, or leave blank until autofilled from business lookup.'}
						</p>
					</div>
					<Button
						type="button"
						variant="secondary"
						onClick={handleOpeningHoursToggle}
						aria-expanded={showHours}
					>
						{showHours ? 'Remove opening hours' : 'Add opening hours'}
					</Button>
				</div>
				{showHours ? (
					<OpeningHoursEditor
						hours={hours}
						onChange={onHoursChange}
					/>
				) : null}
			</div>
		</section>
	);
}
