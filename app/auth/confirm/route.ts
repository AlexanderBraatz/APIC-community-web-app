import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(next: string | null) {
	if (!next || !next.startsWith('/') || next.startsWith('//')) {
		return '/place';
	}
	return next;
}

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url);
	const token_hash = searchParams.get('token_hash');
	const type = searchParams.get('type') as EmailOtpType | null;
	const next = safeNextPath(searchParams.get('next'));
	const code = searchParams.get('code');

	const supabase = await createClient();

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			return NextResponse.redirect(new URL(next, origin));
		}
	}

	if (token_hash && type) {
		const { error } = await supabase.auth.verifyOtp({ type, token_hash });
		if (!error) {
			return NextResponse.redirect(new URL(next, origin));
		}
	}

	return NextResponse.redirect(
		new URL(
			`/sign-in?error=${encodeURIComponent('Auth link is invalid or has expired.')}`,
			origin
		)
	);
}
