import { Globe } from 'lucide-react';
import Link from 'next/link';

export default function SiteLogo({
	className = '',
	size = 'default'
}: {
	className?: string;
	size?: 'default' | 'large';
}) {
	const iconSize = size === 'large' ? 'size-14' : 'size-11';
	const titleSize = size === 'large' ? 'text-4xl' : 'text-3xl';
	const subtitleSize = size === 'large' ? 'text-sm' : 'text-xs';

	return (
		<Link
			href="/"
			className={`inline-flex items-center gap-3 text-[#5D4325] ${className}`}
		>
			<span
				className={`flex ${iconSize} items-center justify-center rounded-full border border-[#7A5A32]/40 bg-[#F8F6F2]`}
			>
				<Globe
					className="size-[55%] text-[#7A5A32]"
					strokeWidth={1.25}
				/>
			</span>
			<span className="flex flex-col leading-none">
				<span className={`font-heading ${titleSize} font-semibold tracking-wide`}>
					APIC
				</span>
				<span
					className={`${subtitleSize} mt-1 font-sans tracking-wide text-[#7A5A32]`}
				>
					Owners Community
				</span>
			</span>
		</Link>
	);
}
