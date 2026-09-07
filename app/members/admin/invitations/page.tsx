import { redirect } from 'next/navigation';
import InvitationActions from '@/components/admin/invitation-actions';
import { inviteUser, listInvitations } from '@/lib/invitations/actions';
import { Button } from '@/components/ui/button';
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
		`/members/admin/invitations?message=${encodeURIComponent('Invitation sent.')}`
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
					Sends a Supabase invitation email. The invitee sets a password on
					/accept-invite.
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
					<Button
						type="submit"
						className="rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22]"
					>
						Send invitation
					</Button>
				</form>
			</section>

			<section>
				<h2 className="text-xl font-medium text-[#444]">Pending invitations</h2>
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
										Last sent {formatWhen(item.last_sent_at)}
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
							<li key={item.id} className="py-3 text-sm">
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
