import PageContent from '@/components/ui/page-content';
import { TrackOnce } from '@/components/analytics/track-once';
import { AnalyticsEvents } from '@/lib/analytics/events';
import client from '@/tina/__generated__/client';

export default async function PlacePage() {
	const result = await client.queries.page({ relativePath: 'place.md' });
	return (
		<>
			<TrackOnce event={AnalyticsEvents.MAP_OPENED} />
			<PageContent {...result} />
		</>
	);
}
