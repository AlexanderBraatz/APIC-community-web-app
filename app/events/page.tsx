import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function EventsPage() {
	const result = await client.queries.page({ relativePath: 'events.md' });
	return <PageContent {...result} />;
}
