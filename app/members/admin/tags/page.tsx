import TagsCoverageTable from '@/components/admin/tags-coverage-table';
import TagsTable from '@/components/admin/tags-table';
import { listAdminListings } from '@/lib/listings/admin-actions';
import { listAdminTags } from '@/lib/listings/tag-admin-actions';

export default async function AdminTagsPage() {
	const [tags, listings] = await Promise.all([
		listAdminTags(),
		listAdminListings()
	]);

	return (
		<div className="space-y-10">
			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-medium text-[#444]">
						Keyword coverage
					</h2>
					<p className="mt-1 text-sm text-[#666]">
						Review which recommendations have missing or thin keyword tagging.
						Click a keyword to bring matching recommendations to the top.
					</p>
				</div>
				<TagsCoverageTable listings={listings} />
			</section>

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-medium text-[#444]">
						Manage keywords
					</h2>
					<p className="mt-1 text-sm text-[#666]">
						Edit canonical names and hidden aliases. Deleting a keyword removes
						it from all recommendations.
					</p>
				</div>
				<TagsTable initialTags={tags} />
			</section>
		</div>
	);
}
