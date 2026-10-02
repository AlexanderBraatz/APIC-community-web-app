'use client';

import { useMemo, useState } from 'react';
import {
	saveInviteFavorites,
	skipInviteFavorites
} from '@/lib/invitations/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InviteOnboardingProgress } from '@/components/auth/invite-onboarding-progress';

export type InviteFavoriteMember = {
	id: string;
	full_name: string;
};

type Props = {
	error?: string;
	members: InviteFavoriteMember[];
	currentUserId: string;
};

export function InviteFavoritesStep({ error, members, currentUserId }: Props) {
	const [query, setQuery] = useState('');
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const others = useMemo(
		() => members.filter(member => member.id !== currentUserId),
		[members, currentUserId]
	);

	const selected = useMemo(
		() => others.filter(member => selectedIds.includes(member.id)),
		[others, selectedIds]
	);

	const suggestions = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		return others
			.filter(
				member =>
					!selectedIds.includes(member.id) &&
					member.full_name.toLowerCase().includes(q)
			)
			.slice(0, 8);
	}, [others, query, selectedIds]);

	function addFavorite(id: string) {
		setSelectedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
		setQuery('');
	}

	function removeFavorite(id: string) {
		setSelectedIds(prev => prev.filter(value => value !== id));
	}

	return (
		<main className="mx-auto flex w-full max-w-md min-h-dvh flex-1 flex-col justify-start px-4 pt-8 pb-16">
			<h1 className="font-heading text-3xl text-[#805b32]">
				Find your favorites
			</h1>
			<p className="mt-2 text-sm text-[#666]">
				Save a few people as favorites so they are easier to find on the
				attendance calendar later. You can skip this if you prefer.
			</p>

			{error ? (
				<p
					className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{error}
				</p>
			) : null}

			<div className="mt-8 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="favorite-search">Find people</Label>
					<Input
						id="favorite-search"
						type="search"
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder="Search by name"
						autoComplete="off"
					/>
					{suggestions.length > 0 ? (
						<ul
							role="listbox"
							className="max-h-56 overflow-y-auto rounded-[2px] border border-[#e5e5e5] bg-white py-1"
						>
							{suggestions.map(member => (
								<li
									key={member.id}
									role="option"
								>
									<button
										type="button"
										onClick={() => addFavorite(member.id)}
										className="block w-full px-3 py-2 text-left text-sm text-[#444] hover:bg-[#f5f0e8]"
									>
										{member.full_name}
									</button>
								</li>
							))}
						</ul>
					) : null}
				</div>

				{selected.length > 0 ? (
					<ul className="space-y-2">
						{selected.map(member => (
							<li
								key={member.id}
								className="flex items-center justify-between gap-3 rounded-[2px] border border-[#e5e5e5] bg-[#faf8f5] px-3 py-2 text-sm text-[#444]"
							>
								<span>{member.full_name}</span>
								<button
									type="button"
									onClick={() => removeFavorite(member.id)}
									className="text-[#805b32] underline"
								>
									Remove
								</button>
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-[#666]">No favorites selected yet.</p>
				)}
			</div>

			<form
				action={skipInviteFavorites}
				className="mt-8"
			>
				<SubmitButton
					variant="outline"
					className="w-full"
				>
					Skip for now
				</SubmitButton>
			</form>
			<form
				action={saveInviteFavorites}
				className="mt-3 space-y-3"
			>
				<input
					type="hidden"
					name="favorite_ids"
					value={selectedIds.join(',')}
				/>
				<SubmitButton
					className="w-full"
					disabled={selectedIds.length === 0}
				>
					Save favorites and continue
				</SubmitButton>
			</form>
			<InviteOnboardingProgress step="favorites" />
		</main>
	);
}
