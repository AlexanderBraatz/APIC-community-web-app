import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function ServicesMaintenancePage() {
	const result = await client.queries.page({
		relativePath: 'services-maintenance.md'
	});
	return <PageContent {...result} />;
}
