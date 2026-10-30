import { notFound } from 'next/navigation';
import { captureNotFoundPage } from '@/lib/sentry/capture';

/**
 * Match unmatched URLs so `notFound()` renders via a real route segment.
 * Without this, root `not-found.tsx` alone can remount in a loop when the
 * layout tree issues RSC / session requests against a path with no page
 * (Next.js App Router + providers in the root layout).
 */
export default async function CatchAllNotFound({
	params
}: {
	params: Promise<{ slug: string[] }>;
}) {
	const { slug } = await params;
	captureNotFoundPage(`/${slug.join('/')}`);
	notFound();
}
