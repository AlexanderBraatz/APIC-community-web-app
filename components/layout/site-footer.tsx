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

				<Link
					href="/privacy"
					className="mt-8 text-sm text-[#777777] underline-offset-4 transition-colors hover:text-[#7A5A32] hover:underline"
				>
					Privacy Policy
				</Link>

				<p className="mt-10 text-xs text-[#777777]">
					© 2026 Apic.Community. All rights reserved.
				</p>
				<p className="mt-2 text-xs text-[#999999]">-</p>
			</div>
		</footer>
	);
}
