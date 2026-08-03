import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuditDetailDialog from '@/components/admin/audit-detail-dialog';
import {
	AUDIT_ACTIONS,
	AUDIT_TARGET_TYPES,
	listAuditLog
} from '@/lib/admin/audit-actions';

function formatWhen(value: string) {
	return new Date(value).toLocaleString();
}

export default async function AdminAuditLogPage({
	searchParams
}: {
	searchParams: Promise<{
		action?: string;
		targetType?: string;
		q?: string;
	}>;
}) {
	const params = await searchParams;
	const actionFilter =
		params.action && AUDIT_ACTIONS.includes(params.action as (typeof AUDIT_ACTIONS)[number])
			? params.action
			: 'all';
	const targetTypeFilter =
		params.targetType &&
		AUDIT_TARGET_TYPES.includes(
			params.targetType as (typeof AUDIT_TARGET_TYPES)[number]
		)
			? params.targetType
			: 'all';

	const rows = await listAuditLog({
		action: actionFilter,
		targetType: targetTypeFilter,
		q: params.q
	});

	return (
		<div className="space-y-8">
			<section>
				<h2 className="text-xl font-medium text-[#444]">Audit log</h2>
				<p className="mt-1 text-sm text-[#666]">
					Read-only history of invitation, role, listing, and related admin
					actions. Showing the 50 newest matches.
				</p>
			</section>

			<form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
				<div className="w-full space-y-2 sm:max-w-xs">
					<Label htmlFor="q">Search summary</Label>
					<Input
						id="q"
						name="q"
						defaultValue={params.q ?? ''}
						placeholder="e.g. Invited, listing name"
					/>
				</div>
				<div className="w-full space-y-2 sm:max-w-xs">
					<Label htmlFor="action">Action</Label>
					<select
						id="action"
						name="action"
						defaultValue={actionFilter}
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						<option value="all">All actions</option>
						{AUDIT_ACTIONS.map(action => (
							<option key={action} value={action}>
								{action}
							</option>
						))}
					</select>
				</div>
				<div className="w-full space-y-2 sm:max-w-xs">
					<Label htmlFor="targetType">Target type</Label>
					<select
						id="targetType"
						name="targetType"
						defaultValue={targetTypeFilter}
						className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						<option value="all">All types</option>
						{AUDIT_TARGET_TYPES.map(type => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
				</div>
				<Button type="submit" variant="outline" className="rounded-[2px]">
					Filter
				</Button>
			</form>

			{rows.length === 0 ? (
				<p className="text-sm text-[#888]">No audit entries match.</p>
			) : (
				<ul className="divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
					{rows.map(row => (
						<li
							key={row.id}
							className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0 text-sm">
								<p className="font-medium text-[#444]">{row.summary}</p>
								<p className="text-[#888]">
									{row.action}
									{' · '}
									{row.targetType}
									{row.targetId ? ` · ${row.targetId.slice(0, 8)}…` : ''}
								</p>
								<p className="text-[#888]">
									{row.adminName ?? 'deleted admin'}
									{' · '}
									{formatWhen(row.createdAt)}
								</p>
							</div>
							<AuditDetailDialog row={row} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
