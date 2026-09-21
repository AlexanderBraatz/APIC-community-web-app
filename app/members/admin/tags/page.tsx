import TagsTable from '@/components/admin/tags-table';
import { listAdminTags } from '@/lib/listings/tag-admin-actions';

export default async function AdminTagsPage() {
	const tags = await listAdminTags();

	return (
		<div className="space-y-8">
			<section>
				<h2 className="text-xl font-medium text-[#444]">Manage keywords</h2>
				<p className="mt-1 text-sm text-[#666]">
					Edit canonical names and hidden aliases. Deleting a keyword removes it
					from all listings.
				</p>
			</section>
			<TagsTable initialTags={tags} />
		</div>
	);
}
