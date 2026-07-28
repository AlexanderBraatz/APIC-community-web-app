import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function FoodDiningPage() {
	const result = await client.queries.page({ relativePath: 'food-dining.md' });
	return <PageContent {...result} />;
}
