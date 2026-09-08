import Scheduler from '@/app/components/scheduler';
import { loadSchedulerData } from '@/lib/attendance/actions';

export default async function CommunityCalendarPage() {
	const data = await loadSchedulerData();

	return (
		<Scheduler
			profiles={data.profiles}
			attendance={data.attendance}
			preferences={data.preferences}
			currentUserId={data.currentUserId}
			isAdmin={data.isAdmin}
		/>
	);
}
