import Image from 'next/image';
import { getAdminDashboardCounts } from '@/lib/admin/audit-actions';

/** Set these when walkthrough videos are published on Vimeo. */
const MEMBER_WALKTHROUGH_VIMEO_ID = '';
const ADMIN_WALKTHROUGH_VIMEO_ID = '';

function VimeoEmbed({
	id,
	title,
	comingSoonLabel
}: {
	id: string;
	title: string;
	comingSoonLabel: string;
}) {
	return (
		<figure>
			<div className="aspect-video overflow-hidden border border-[#e5e5e5] bg-[#f7f4ef]">
				{id ? (
					<iframe
						src={`https://player.vimeo.com/video/${id}`}
						title={title}
						className="size-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				) : (
					<div className="flex size-full items-center justify-center px-4 text-center text-sm text-[#888]">
						{comingSoonLabel}
					</div>
				)}
			</div>
			<figcaption className="mt-2 text-sm font-medium text-[#444]">
				{title}
			</figcaption>
		</figure>
	);
}

export default async function MembersAdminDashboardPage() {
	const counts = await getAdminDashboardCounts();

	const tiles = [
		{
			label: 'Members',
			value: counts.users
		},
		{
			label: 'Blog posts',
			value: counts.blogPosts
		},
		{
			label: 'Listings',
			value: counts.listings
		},
		{
			label: 'Calendar entries',
			value: counts.calendarEntries
		}
	];

	return (
		<div className="space-y-10">
			<section>
				<h2 className="text-xl font-medium text-[#444]">Dashboard</h2>
				<p className="mt-1 text-sm text-[#666]">
					Operational overview, walkthroughs, and handover resources for
					membership and places.
				</p>
			</section>

			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{tiles.map(tile => (
					<div
						key={tile.label}
						className="border border-[#e5e5e5] px-4 py-5"
					>
						<p className="text-xs tracking-wide text-[#888] uppercase">
							{tile.label}
						</p>
						<p className="mt-2 font-heading text-3xl text-[#805b32]">
							{tile.value}
						</p>
					</div>
				))}
			</section>

			<section>
				<h3 className="text-lg font-medium text-[#444]">Walkthrough videos</h3>
				<p className="mt-1 text-sm text-[#666]">
					How to use the app as a member, then as an admin.
				</p>
				<div className="mt-4 grid gap-6 md:grid-cols-2">
					<VimeoEmbed
						id={MEMBER_WALKTHROUGH_VIMEO_ID}
						title="Member walkthrough"
						comingSoonLabel="Member walkthrough video coming soon"
					/>
					<VimeoEmbed
						id={ADMIN_WALKTHROUGH_VIMEO_ID}
						title="Admin walkthrough"
						comingSoonLabel="Admin walkthrough video coming soon"
					/>
				</div>
			</section>

			<section>
				<h3 className="text-lg font-medium text-[#444]">Developer contact</h3>
				<p className="mt-1 text-sm text-[#666]">
					Reach the original developer for questions or account/data handoff
					help.
				</p>
				<div className="mt-4 flex flex-col gap-4 border border-[#e5e5e5] p-4 sm:flex-row sm:items-center">
					<Image
						src="/images/alexander-braatz.png"
						alt="Alexander Braatz"
						width={96}
						height={96}
						className="size-24 shrink-0 rounded-full object-cover"
					/>
					<div className="min-w-0 text-sm">
						<p className="font-medium text-[#444]">Alexander Braatz</p>
						<ul className="mt-2 space-y-1 text-[#666]">
							<li>
								WhatsApp:{' '}
								<a
									href="https://wa.me/447394913192"
									className="text-[#805b32] underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									+44 7394 913192
								</a>
							</li>
							<li>
								Email:{' '}
								<a
									href="mailto:alex_braatz@icloud.com"
									className="text-[#805b32] underline"
								>
									alex_braatz@icloud.com
								</a>
							</li>
							<li>
								Website:{' '}
								<a
									href="https://alexanderbraatz.com"
									className="text-[#805b32] underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									alexanderbraatz.com
								</a>
							</li>
						</ul>
					</div>
				</div>
			</section>

			<section>
				<details className="border border-[#e5e5e5]">
					<summary className="cursor-pointer px-4 py-3 text-lg font-medium text-[#444]">
						Technical handover
					</summary>
					<div className="border-t border-[#e5e5e5] px-4 py-3">
						<p className="text-sm text-[#666]">
							Insurance document covering the tech stack, required accounts,
							env vars, and how to relaunch or hand the app to another
							developer.
						</p>
						<p className="mt-3 text-sm">
							<a
								href="/docs/apic-community-handover.pdf"
								download
								className="text-[#805b32] underline"
							>
								Download technical handover PDF
							</a>
						</p>
					</div>
				</details>
			</section>
		</div>
	);
}
