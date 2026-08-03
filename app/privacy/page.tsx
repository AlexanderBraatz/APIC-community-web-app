import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function PrivacyPage() {
	const result = await client.queries.page({ relativePath: 'privacy.md' });
	return <PageContent {...result} />;
}
