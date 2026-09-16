import Link from 'next/link';
import SiteLogo from './site-logo';

export default function SiteFooter() {
	return (
		<footer className="border-t border-[#7A5A32]/10 bg-white">
			<div className="mx-auto flex max-w-[1400px] flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
				<SiteLogo size="large" />

				<div className="mt-10 space-y-1 text-sm leading-relaxed text-[#777777]">
					<p className="font-medium tracking-wide text-[#444444]">
						IMMOBILIARI DI CASTELFALFI ETS
					</p>
					<p>Largo Don Pino Puglisi, 6</p>
					<p>56028 San Miniato PI</p>
					<p>Tax Code (Codice Fiscale): 90073880503</p>
					<p>National Register of the Third Sector (RUNTS)</p>
					<p>Registration No.: 146236</p>
				</div>

				<div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#777777]">
					<Link
						href="/privacy"
						className="underline-offset-4 transition-colors hover:text-[#7A5A32] hover:underline"
					>
						Privacy Policy
					</Link>
					<span aria-hidden="true">·</span>
					<Link
						href="/terms"
						className="underline-offset-4 transition-colors hover:text-[#7A5A32] hover:underline"
					>
						Terms &amp; Conditions
					</Link>
				</div>

				<p className="mt-10 text-xs text-[#777777]">
					© 2026 Apic.Community. All rights reserved.
				</p>
				<Link
					href="/admin"
					className="mt-2 text-xs text-[#999999]"
					aria-label="Open content and blog admin"
				>
					Content &amp; Blog Admin
				</Link>
			</div>
		</footer>
	);
}
