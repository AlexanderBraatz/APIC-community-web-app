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
	const isAuthenticated = Boolean(data?.claims);

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

	return supabaseResponse;
}
