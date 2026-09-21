import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function LegalPage() {
	const result = await client.queries.page({ relativePath: 'legal.md' });
	return <PageContent {...result} />;
}
