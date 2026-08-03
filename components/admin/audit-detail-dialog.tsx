'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { AuditLogRow } from '@/lib/admin/audit-actions';

function formatWhen(value: string) {
	return new Date(value).toLocaleString();
}

function JsonBlock({
	label,
	value
}: {
	label: string;
	value: Record<string, unknown> | null;
}) {
	return (
		<div className="space-y-1">
			<p className="text-xs tracking-wide text-[#888] uppercase">{label}</p>
			{value ? (
				<pre className="max-h-56 overflow-auto rounded-[2px] border border-[#e5e5e5] bg-[#fafafa] p-3 text-xs break-words whitespace-pre-wrap text-[#444]">
					{JSON.stringify(value, null, 2)}
				</pre>
			) : (
				<p className="text-sm text-[#888]">—</p>
			)}
		</div>
	);
}

export default function AuditDetailDialog({ row }: { row: AuditLogRow }) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="outline"
				className="rounded-[2px]"
				size="sm"
				onClick={() => setOpen(true)}
			>
				Details
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-lg" showCloseButton>
					<DialogHeader>
						<DialogTitle>{row.action}</DialogTitle>
						<DialogDescription>{row.summary}</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 text-sm text-[#666]">
						<p>
							<span className="text-[#888]">When: </span>
							{formatWhen(row.createdAt)}
						</p>
						<p>
							<span className="text-[#888]">Admin: </span>
							{row.adminName ?? (row.adminUserId ? row.adminUserId : '—')}
						</p>
						<p>
							<span className="text-[#888]">Target: </span>
							{row.targetType}
							{row.targetId ? ` · ${row.targetId}` : ''}
						</p>
						<JsonBlock label="Before (old_values)" value={row.oldValues} />
						<JsonBlock label="After (new_values)" value={row.newValues} />
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={() => setOpen(false)}
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
