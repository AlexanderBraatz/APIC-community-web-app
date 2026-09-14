import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function TermsPage() {
	const result = await client.queries.page({ relativePath: 'terms.md' });
	return <PageContent {...result} />;
}
