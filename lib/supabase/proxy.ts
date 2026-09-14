import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from './env';

const PROTECTED_PREFIXES = [
	'/community-calendar',
	'/place',
	'/account',
	'/members'
] as const;

const AUTH_ONLY_WHEN_SIGNED_OUT = ['/sign-in', '/forgot-password'] as const;

/** Routes allowed while authenticated but before privacy onboarding is done. */
const PRIVACY_ONBOARDING_ALLOWLIST = [
	'/accept-invite',
	'/terms',
	'/privacy',
	'/auth',
	'/reset-password',
	'/sign-out'
] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]) {
	return prefixes.some(
		prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request
	});

	const { url, key } = getSupabaseEnv();

	const supabase = createServerClient(url, key, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value }) => {
					request.cookies.set(name, value);
				});
				supabaseResponse = NextResponse.next({
					request
				});
				cookiesToSet.forEach(({ name, value, options }) => {
					supabaseResponse.cookies.set(name, value, options);
				});
			}
		}
	});

	// Do not run logic between createServerClient and getClaims().
	const { data } = await supabase.auth.getClaims();
	const claims = data?.claims;
	const isAuthenticated = Boolean(claims);
	const userId =
		typeof claims?.sub === 'string' ? claims.sub : undefined;

	const { pathname, search } = request.nextUrl;

	if (!isAuthenticated && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
		const redirectUrl = request.nextUrl.clone();
		redirectUrl.pathname = '/sign-in';
		redirectUrl.search = '';
		redirectUrl.searchParams.set('next', `${pathname}${search}`);
		return NextResponse.redirect(redirectUrl);
	}

	if (isAuthenticated && matchesPrefix(pathname, AUTH_ONLY_WHEN_SIGNED_OUT)) {
		const redirectUrl = request.nextUrl.clone();
		redirectUrl.pathname = '/place';
		redirectUrl.search = '';
		return NextResponse.redirect(redirectUrl);
	}

	// Gate protected member areas until privacy/terms preferences exist.
	if (
		isAuthenticated &&
		userId &&
		matchesPrefix(pathname, PROTECTED_PREFIXES) &&
		!matchesPrefix(pathname, PRIVACY_ONBOARDING_ALLOWLIST)
	) {
		const { data: prefs } = await supabase
			.from('privacy_preferences')
			.select('user_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!prefs) {
			const redirectUrl = request.nextUrl.clone();
			redirectUrl.pathname = '/accept-invite';
			redirectUrl.search = '';
			redirectUrl.searchParams.set('step', 'privacy');
			return NextResponse.redirect(redirectUrl);
		}
	}

	return supabaseResponse;
}
