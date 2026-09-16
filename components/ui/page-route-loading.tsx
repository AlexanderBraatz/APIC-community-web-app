import { Loader2 } from 'lucide-react';

export default function PageRouteLoading() {
	return (
		<div
			className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4"
			role="status"
			aria-live="polite"
		>
			<Loader2
				className="size-8 animate-spin text-[#805b32]"
				aria-hidden
			/>
			<span className="text-sm text-[#666]">Loading…</span>
		</div>
	);
}
