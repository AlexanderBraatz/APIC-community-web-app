import { notFound } from 'next/navigation';
import BlogFormStepper from '@/components/admin/blog-form-stepper';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getBlogMapLocation } from '@/lib/blog/map-location-actions';
import { getBlogPostForAdmin } from '@/lib/blog/queries';

export default async function EditBlogPostPage({
	params
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const { user, profile } = await requireAdmin();
	const post = await getBlogPostForAdmin(id);
	if (!post) notFound();

	const mapLocation = await getBlogMapLocation(post.id);
	const defaultAuthor =
		profile.full_name?.trim() || user.email?.trim() || 'Admin';

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-medium text-[#444]">Edit blog article</h2>
				<p className="mt-1 text-sm text-[#666]">{post.title}</p>
			</div>
			<BlogFormStepper
				mode="edit"
				post={post}
				mapLocation={mapLocation}
				defaultAuthor={defaultAuthor}
			/>
		</div>
	);
}
