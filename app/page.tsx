import PageContent from '@/components/ui/page-content';
import Scheduler from './components/scheduler';
import client from '@/tina/__generated__/client';

export default async function Home() {
	const result = await client.queries.page({ relativePath: 'home.md' });
	return <PageContent {...result} />;
	// return <Scheduler />;
}
