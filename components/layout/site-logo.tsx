import Link from 'next/link';
import Image from 'next/image';

export default function SiteLogo({
	className = '',
	size = 'default'
}: {
	className?: string;
	size?: 'default' | 'large';
}) {
	const width = size === 'large' ? 280 : 200;
	const height = size === 'large' ? 55 : 39;

	return (
		<Link
			href="/"
			className={`inline-flex ${className}`}
		>
			<Image
				src="/images/apic_community_logo_cropped.png"
				alt="APIC Owners Community"
				width={width}
				height={height}
				className="h-auto w-auto max-h-[55px] object-contain"
				priority
			/>
		</Link>
	);
}
