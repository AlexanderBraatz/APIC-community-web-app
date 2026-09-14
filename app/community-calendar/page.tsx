import Scheduler from '@/app/components/scheduler';
import { TrackOnce } from '@/components/analytics/track-once';
import { AnalyticsEvents } from '@/lib/analytics/events';
import { loadSchedulerData } from '@/lib/attendance/actions';

export default async function CommunityCalendarPage() {
	const data = await loadSchedulerData();

	return (
		<>
			<TrackOnce event={AnalyticsEvents.CALENDAR_VIEWED} />
			<Scheduler
				profiles={data.profiles}
				attendance={data.attendance}
				preferences={data.preferences}
				currentUserId={data.currentUserId}
				isAdmin={data.isAdmin}
			/>
		</>
	);
}
