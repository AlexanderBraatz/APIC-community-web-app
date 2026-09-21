export const APIC_ADMIN_EMAIL = 'info.apic@aol.com';

export type AuthLinkFlow = 'invite' | 'recovery' | 'unknown';

export type AuthLinkErrorKind = 'expired' | 'generic';

const EXPIRED_MESSAGE_RE =
	/expired|invalid or has expired|email link is invalid|otp_expired|token has expired/i;

export function resolveAuthLinkFlow(input: {
	type?: string | null;
	hashType?: string | null;
	next?: string | null;
}): AuthLinkFlow {
	const type = (input.type || input.hashType || '').toLowerCase();
	if (type === 'invite' || type === 'signup') return 'invite';
	if (type === 'recovery') return 'recovery';

	const next = input.next || '';
	if (next.includes('accept-invite')) return 'invite';
	if (next.includes('reset-password')) return 'recovery';

	return 'unknown';
}

export function isExpiredAuthLinkError(input: {
	code?: string | null;
	message?: string | null;
	errorCode?: string | null;
	errorDescription?: string | null;
}): boolean {
	const code = (input.code || input.errorCode || '').toLowerCase();
	if (code === 'otp_expired') return true;

	const text = `${input.message || ''} ${input.errorDescription || ''}`;
	return EXPIRED_MESSAGE_RE.test(text);
}

export function authLinkErrorCopy(
	kind: AuthLinkErrorKind,
	flow: AuthLinkFlow
): { title: string; body: string; showForgotPassword: boolean } {
	if (kind === 'expired') {
		if (flow === 'recovery') {
			return {
				title: 'Reset link expired',
				body: 'This password reset link has expired. Please contact the APIC admins for help, or request a new reset link.',
				showForgotPassword: true
			};
		}
		if (flow === 'invite') {
			return {
				title: 'Invitation link expired',
				body: 'This invitation link has expired. Please contact the APIC admins to request a new invite.',
				showForgotPassword: false
			};
		}
		return {
			title: 'Link expired',
			body: 'This email link has expired. Please contact the APIC admins for help.',
			showForgotPassword: false
		};
	}

	return {
		title: 'Link could not be confirmed',
		body: 'This email link is invalid or could not be used. Please contact the APIC admins for help.',
		showForgotPassword: flow === 'recovery'
	};
}
