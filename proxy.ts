import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
	return updateSession(request);
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static, _next/image
		 * - favicon and common static assets
		 * - TinaCMS static admin (rewritten to /admin/index.html)
		 */
		'/((?!_next/static|_next/image|favicon.ico|admin/|sentry-tunnel|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'
	]
};
