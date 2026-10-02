import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
	isIncompleteInviteOnboardingStep,
	type InviteFlowStep
} from './onboarding-steps';

export type { InviteFlowStep, InviteOnboardingStep } from './onboarding-steps';
export {
	INVITE_FLOW_STEPS,
	INVITE_ONBOARDING_STEPS,
	inviteFlowStepIndex,
	isIncompleteInviteOnboardingStep,
	isInviteOnboardingStep
} from './onboarding-steps';

/**
 * Resolve where an authenticated invitee should be in the join flow.
 * Legacy members: privacy prefs exist and onboarding_step is null → done.
 */
export async function resolveInviteFlowStep(user: {
	id: string;
	email?: string | null;
}): Promise<InviteFlowStep | 'done'> {
	const supabase = await createClient();

	const { data: prefs } = await supabase
		.from('privacy_preferences')
		.select('user_id')
		.eq('user_id', user.id)
		.maybeSingle();

	const { data: profile } = await supabase
		.from('profiles')
		.select('onboarding_step')
		.eq('id', user.id)
		.maybeSingle();

	if (prefs) {
		const step = profile?.onboarding_step;
		if (step === 'done' || step == null) {
			return 'done';
		}
		if (isIncompleteInviteOnboardingStep(step)) {
			return step;
		}
		return 'done';
	}

	const email = user.email?.toLowerCase();
	if (email) {
		const admin = createServiceRoleClient();
		const { data: invitation } = await admin
			.from('user_invitations')
			.select('id, status')
			.eq('status', 'pending')
			.ilike('email', email)
			.maybeSingle();

		if (invitation) {
			return 'password';
		}
	}

	return 'privacy';
}
