import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function AboutPage() {
	const result = await client.queries.page({ relativePath: 'about.md' });
	return <PageContent {...result} />;
}
