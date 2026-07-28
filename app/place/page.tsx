import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function PlacePage() {
	const result = await client.queries.page({ relativePath: 'place.md' });
	return <PageContent {...result} />;
}
