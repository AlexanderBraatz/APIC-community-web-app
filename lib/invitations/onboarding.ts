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
 * Pending allowlist membership lasts until the wizard finishes, so password
 * progress is tracked in app_metadata instead of invitation status.
 */
export async function resolveInviteFlowStep(user: {
	id: string;
	email?: string | null;
	app_metadata?: Record<string, unknown> | null;
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

	const email = user.email?.trim().toLowerCase();
	if (email) {
		const admin = createServiceRoleClient();
		const { data: invitation } = await admin
			.from('user_invitations')
			.select('id, status')
			.eq('status', 'pending')
			.eq('email', email)
			.maybeSingle();

		if (invitation) {
			// Prefer live app_metadata (JWT can lag right after password step).
			const { data: authUser } = await admin.auth.admin.getUserById(user.id);
			const passwordSet =
				authUser.user?.app_metadata?.invite_password_set === true ||
				user.app_metadata?.invite_password_set === true;
			return passwordSet ? 'privacy' : 'password';
		}
	}

	return 'privacy';
}
