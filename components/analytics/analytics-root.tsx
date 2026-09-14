import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getPrivacyPreferencesForCurrentUser } from '@/lib/privacy/get-preferences';
import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { AnalyticsWelcomeEvents } from '@/components/analytics/analytics-welcome-events';

export async function AnalyticsRoot({
	children
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	let role: string | null = null;
	let analyticsEnabled = false;
	let sessionReplayEnabled = false;

	if (user) {
		const [{ data: profile }, prefs] = await Promise.all([
			supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
			getPrivacyPreferencesForCurrentUser()
		]);
		role = profile?.role ?? null;
		analyticsEnabled = prefs?.analytics_enabled ?? false;
		sessionReplayEnabled = prefs?.session_replay_enabled ?? false;
	}

	return (
		<PostHogProvider
			userId={user?.id ?? null}
			role={role}
			analyticsEnabled={analyticsEnabled}
			sessionReplayEnabled={sessionReplayEnabled}
		>
			<Suspense fallback={null}>
				<AnalyticsWelcomeEvents />
			</Suspense>
			{children}
		</PostHogProvider>
	);
}
