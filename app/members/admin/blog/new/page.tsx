import BlogFormStepper from '@/components/admin/blog-form-stepper';
import { requireAdmin } from '@/lib/admin/require-admin';

export default async function NewBlogPostPage() {
	const { user, profile } = await requireAdmin();
	const defaultAuthor =
		profile.full_name?.trim() || user.email?.trim() || 'Admin';

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-medium text-[#444]">New blog article</h2>
				<p className="mt-1 text-sm text-[#666]">
					Step through header, featured image, optional location, and body —
					then preview and publish. Drafts save as you go.
				</p>
			</div>
			<BlogFormStepper
				mode="create"
				defaultAuthor={defaultAuthor}
			/>
		</div>
	);
}
