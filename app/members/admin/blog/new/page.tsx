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
					Header and location now; body editor arrives in Stage 5.
				</p>
			</div>
			<BlogFormStepper
				mode="create"
				defaultAuthor={defaultAuthor}
			/>
		</div>
	);
}
