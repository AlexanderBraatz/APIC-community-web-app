import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function HealthWellnessPage() {
	const result = await client.queries.page({ relativePath: 'health-wellness.md' });
	return <PageContent {...result} />;
}
