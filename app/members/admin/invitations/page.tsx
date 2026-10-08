import { redirect } from 'next/navigation';
import InvitationActions from '@/components/admin/invitation-actions';
import {
	inviteUser,
	inviteUsersBulk,
	listInvitations
} from '@/lib/invitations/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function formatWhen(value: string | null) {
	if (!value) return '—';
	return new Date(value).toLocaleString();
}

async function inviteAction(formData: FormData) {
	'use server';
	const result = await inviteUser(formData);
	if (!result.ok) {
		redirect(
			`/members/admin/invitations?error=${encodeURIComponent(result.error)}`
		);
	}
	redirect(
		`/members/admin/invitations?message=${encodeURIComponent(
			'Invitation sent with a join link.'
		)}`
	);
}

async function bulkInviteAction(formData: FormData) {
	'use server';
	const result = await inviteUsersBulk(formData);
	if (!result.ok) {
		redirect(
			`/members/admin/invitations?error=${encodeURIComponent(result.error)}`
		);
	}

	const parts = [`Invited ${result.invited}.`];
	if (result.skipped > 0) {
		parts.push(`Skipped ${result.skipped}.`);
	}
	if (result.errors.length > 0) {
		const detail = result.errors.slice(0, 5).join(' ');
		const more =
			result.errors.length > 5 ? ` (+${result.errors.length - 5} more)` : '';
		redirect(
			`/members/admin/invitations?message=${encodeURIComponent(
				parts.join(' ')
			)}&error=${encodeURIComponent(detail + more)}`
		);
	}

	redirect(
		`/members/admin/invitations?message=${encodeURIComponent(parts.join(' '))}`
	);
}

export default async function AdminInvitationsPage({
	searchParams
}: {
	searchParams: Promise<{ error?: string; message?: string }>;
}) {
	const params = await searchParams;
	const invitations = await listInvitations();
	const pending = invitations.filter(item => item.status === 'pending');
	const history = invitations.filter(item => item.status !== 'pending');

	return (
		<div className="space-y-10">
			<section>
				<h2 className="text-xl font-medium text-[#444]">Invite a member</h2>
				<p className="mt-1 text-sm text-[#666]">
					Adds the email to the allowlist and sends an invitation link (valid up
					to 24 hours). They stay on the allowlist until they finish joining, so
					you can resend the invitation if they stop mid-way and lose the email.
					If their link fails, they can request a one-time code themselves.
				</p>

				{params.error ? (
					<p
						className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
						role="alert"
					>
						{params.error}
					</p>
				) : null}
				{params.message ? (
					<p
						className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
						role="status"
					>
						{params.message}
					</p>
				) : null}

				<form
					action={inviteAction}
					className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
				>
					<div className="w-full space-y-2 sm:max-w-sm">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							required
							autoComplete="email"
						/>
					</div>
					<SubmitButton className="w-full sm:w-auto">
						Send invitation
					</SubmitButton>
				</form>
			</section>

			<section>
				<h2 className="text-xl font-medium text-[#444]">Bulk invite</h2>
				<p className="mt-1 text-sm text-[#666]">
					Paste up to 50 emails (one per line, or comma-separated) for launch
					onboarding.
				</p>
				<form
					action={bulkInviteAction}
					className="mt-4 space-y-3"
				>
					<div className="space-y-2">
						<Label htmlFor="emails">Emails</Label>
						<textarea
							id="emails"
							name="emails"
							required
							rows={8}
							className="flex w-full rounded-[2px] border border-[#d4c4b0] bg-white px-3 py-2 text-sm text-[#444] outline-none focus-visible:border-[#805b32] focus-visible:ring-2 focus-visible:ring-[#805b32]/30"
							placeholder={'member1@example.com\nmember2@example.com'}
						/>
					</div>
					<SubmitButton className="w-full sm:w-auto">
						Send bulk invitations
					</SubmitButton>
				</form>
			</section>

			<section>
				<h2 className="text-xl font-medium text-[#444]">Pending invitations</h2>
				<p className="mt-1 text-sm text-[#666]">
					These users have not finished joining yet. Click Resend to send a
					fresh invitation link (and restarts onboarding if they already
					started). Cancel removes them.
				</p>
				{pending.length === 0 ? (
					<p className="mt-3 text-sm text-[#888]">No pending invitations.</p>
				) : (
					<ul className="mt-4 divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
						{pending.map(item => (
							<li
								key={item.id}
								className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="text-sm">
									<p className="font-medium text-[#444]">{item.email}</p>
									<p className="text-[#888]">
										Invited by {item.inviter_name ?? 'admin'} ·{' '}
										{formatWhen(item.invited_at)}
									</p>
									<p className="text-[#888]">
										Last code sent {formatWhen(item.last_sent_at)}
									</p>
								</div>
								<InvitationActions
									invitationId={item.id}
									email={item.email}
								/>
							</li>
						))}
					</ul>
				)}
			</section>

			<section>
				<h2 className="text-xl font-medium text-[#444]">Invitation history</h2>
				{history.length === 0 ? (
					<p className="mt-3 text-sm text-[#888]">No history yet.</p>
				) : (
					<ul className="mt-4 divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
						{history.map(item => (
							<li
								key={item.id}
								className="py-3 text-sm"
							>
								<p className="font-medium text-[#444]">
									{item.email}{' '}
									<span className="font-normal text-[#888]">
										({item.status})
									</span>
								</p>
								<p className="text-[#888]">
									Invited {formatWhen(item.invited_at)}
									{item.accepted_at
										? ` · Accepted ${formatWhen(item.accepted_at)}`
										: ''}
									{item.cancelled_at
										? ` · Cancelled ${formatWhen(item.cancelled_at)}`
										: ''}
								</p>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
