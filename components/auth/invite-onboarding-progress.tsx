import {
	INVITE_FLOW_STEPS,
	inviteFlowStepIndex,
	type InviteFlowStep
} from '@/lib/invitations/onboarding-steps';

type Props = {
	step: InviteFlowStep;
};

export function InviteOnboardingProgress({ step }: Props) {
	const current = inviteFlowStepIndex(step) + 1;
	const total = INVITE_FLOW_STEPS.length;

	return (
		<p
			className="mt-10 text-center text-sm text-[#666]"
			aria-live="polite"
		>
			Step {current} of {total}
		</p>
	);
}
