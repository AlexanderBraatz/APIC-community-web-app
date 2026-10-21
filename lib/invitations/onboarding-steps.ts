export const INVITE_ONBOARDING_STEPS = [
	'language',
	'name',
	'colour',
	'attendance',
	'favorites',
	'done'
] as const;

export type InviteOnboardingStep = (typeof INVITE_ONBOARDING_STEPS)[number];

export type InviteFlowStep =
	| 'password'
	| 'privacy'
	| 'language'
	| 'name'
	| 'colour'
	| 'attendance'
	| 'favorites';

/** Ordered invite onboarding screens shown to the user (excludes `done`). */
export const INVITE_FLOW_STEPS: readonly InviteFlowStep[] = [
	'password',
	'privacy',
	'language',
	'name',
	'colour',
	'attendance',
	'favorites'
] as const;

export function inviteFlowStepIndex(step: InviteFlowStep): number {
	return INVITE_FLOW_STEPS.indexOf(step);
}

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
): value is 'language' | 'name' | 'colour' | 'attendance' | 'favorites' {
	return (
		value === 'language' ||
		value === 'name' ||
		value === 'colour' ||
		value === 'attendance' ||
		value === 'favorites'
	);
}
