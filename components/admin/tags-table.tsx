'use client';

import { useMemo, useState, useTransition } from 'react';
import {
	deleteTag,
	fillMissingAliases,
	updateTag,
	type AdminTagRow
} from '@/lib/listings/tag-admin-actions';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';

export default function TagsTable({ initialTags }: { initialTags: AdminTagRow[] }) {
	const [tags, setTags] = useState(initialTags);
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [editId, setEditId] = useState<string | null>(null);
	const [editName, setEditName] = useState('');
	const [editAliases, setEditAliases] = useState('');
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const deleteName = useMemo(
		() => tags.find(tag => tag.id === deleteId)?.name ?? '',
		[tags, deleteId]
	);

	function openEdit(tag: AdminTagRow) {
		setEditId(tag.id);
		setEditName(tag.name);
		setEditAliases(tag.aliases.join(', '));
		setError(null);
	}

	function saveEdit() {
		if (!editId) return;
		startTransition(async () => {
			setError(null);
			const aliases = editAliases
				.split(/[,\n]/)
				.map(part => part.trim())
				.filter(Boolean);
			const result = await updateTag(editId, { name: editName, aliases });
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setTags(prev =>
				prev
					.map(tag =>
						tag.id === editId
							? { ...tag, name: editName.trim(), aliases }
							: tag
					)
					.sort((a, b) => a.name.localeCompare(b.name))
			);
			setEditId(null);
			setMessage('Tag updated.');
		});
	}

	function confirmDelete() {
		if (!deleteId) return;
		startTransition(async () => {
			setError(null);
			const result = await deleteTag(deleteId);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setTags(prev => prev.filter(tag => tag.id !== deleteId));
			setDeleteId(null);
			setMessage('Tag deleted.');
		});
	}

	function runFillMissing() {
		startTransition(async () => {
			setError(null);
			setMessage(null);
			const result = await fillMissingAliases();
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setMessage(
				result.filled === 0
					? `No empty alias arrays among ${result.scanned} tag(s).`
					: `Filled aliases on ${result.filled} of ${result.scanned} empty tag(s). Refresh if needed.`
			);
			// Soft refresh from server would be ideal; reload page list via router.refresh pattern:
			window.location.reload();
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-[#666]">
					{tags.length} tag{tags.length === 1 ? '' : 's'}. Aliases are used for
					resolve/search only.
				</p>
				<Button
					type="button"
					variant="outline"
					className="rounded-[2px]"
					onClick={runFillMissing}
					disabled={pending}
				>
					{pending ? 'Working…' : 'Fill missing aliases'}
				</Button>
			</div>

			{error ? (
				<p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
					{error}
				</p>
			) : null}
			{message ? (
				<p
					className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
					role="status"
				>
					{message}
				</p>
			) : null}

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[220px]">ID</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Aliases</TableHead>
						<TableHead className="w-[160px]">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{tags.map(tag => (
						<TableRow key={tag.id}>
							<TableCell className="font-mono text-xs text-[#888]">
								{tag.id}
							</TableCell>
							<TableCell className="font-medium text-[#444]">{tag.name}</TableCell>
							<TableCell className="text-[#666]">
								{tag.aliases.length ? tag.aliases.join(', ') : '—'}
							</TableCell>
							<TableCell>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										variant="outline"
										className="rounded-[2px]"
										onClick={() => openEdit(tag)}
									>
										Edit
									</Button>
									<Button
										type="button"
										variant="outline"
										className="rounded-[2px]"
										onClick={() => setDeleteId(tag.id)}
									>
										Delete
									</Button>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<Dialog
				open={editId !== null}
				onOpenChange={open => {
					if (!open) setEditId(null);
				}}
			>
				<DialogContent className="sm:max-w-lg" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Edit tag</DialogTitle>
						<DialogDescription>
							Rename the canonical tag or edit its under-the-hood aliases
							(comma-separated).
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="edit_name">Name</Label>
							<Input
								id="edit_name"
								value={editName}
								onChange={e => setEditName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit_aliases">Aliases</Label>
							<Input
								id="edit_aliases"
								value={editAliases}
								onChange={e => setEditAliases(e.target.value)}
								placeholder="italian, italien, italia"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={() => setEditId(null)}
							disabled={pending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="rounded-[2px] border border-[#634627] bg-[#805b32] text-white hover:bg-[#1f2d22]"
							onClick={saveEdit}
							disabled={pending}
						>
							{pending ? 'Saving…' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={deleteId !== null}
				onOpenChange={open => {
					if (!open) setDeleteId(null);
				}}
			>
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Delete tag?</DialogTitle>
						<DialogDescription>
							This permanently removes “{deleteName}” and cascades all listing
							assignments. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="rounded-[2px]"
							onClick={() => setDeleteId(null)}
							disabled={pending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="rounded-[2px] border border-red-800 bg-red-700 text-white hover:bg-red-800"
							onClick={confirmDelete}
							disabled={pending}
						>
							{pending ? 'Deleting…' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
