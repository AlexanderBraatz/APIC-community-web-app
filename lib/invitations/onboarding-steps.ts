export const INVITE_ONBOARDING_STEPS = [
	'name',
	'colour',
	'favorites',
	'done'
] as const;

export type InviteOnboardingStep = (typeof INVITE_ONBOARDING_STEPS)[number];

export type InviteFlowStep =
	| 'password'
	| 'privacy'
	| 'name'
	| 'colour'
	| 'favorites';

export function isInviteOnboardingStep(
	value: string | null | undefined
): value is InviteOnboardingStep {
	return (
		typeof value === 'string' &&
		(INVITE_ONBOARDING_STEPS as readonly string[]).includes(value)
	);
}

/** Incomplete post-privacy steps that must finish before entering the app. */
export function isIncompleteInviteOnboardingStep(
	value: string | null | undefined
): value is 'name' | 'colour' | 'favorites' {
	return value === 'name' || value === 'colour' || value === 'favorites';
}
