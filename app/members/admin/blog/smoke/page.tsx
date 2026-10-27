import { SmokeClient } from './smoke-client';

/**
 * Stage 3 smoke; remove or replace in Stage 4.
 * Temporary admin-only UI to exercise blog write server actions
 * without the full stepper.
 */
export default function BlogSmokePage() {
	return (
		<div className="space-y-4">
			<p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
				Stage 3 smoke; remove or replace in Stage 4. Admin-only write-API
				exerciser — not a product UI.
			</p>
			<h2 className="font-heading text-2xl text-[#805b32]">
				Blog write API smoke
			</h2>
			<SmokeClient />
		</div>
	);
}
