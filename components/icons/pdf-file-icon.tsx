import type { SVGProps } from 'react';

/** Compact document glyph with a PDF mark — used on manual download buttons. */
export function PdfFileIcon({
	className,
	...props
}: SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden
			{...props}
		>
			<path
				d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinejoin="round"
			/>
			<path
				d="M14 2v6h6"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinejoin="round"
			/>
			<rect x="6.5" y="12.25" width="11" height="5.5" rx="1" fill="currentColor" />
			<text
				x="12"
				y="16.35"
				textAnchor="middle"
				fill="white"
				fontSize="3.6"
				fontFamily="ui-sans-serif, system-ui, sans-serif"
				fontWeight="700"
			>
				PDF
			</text>
		</svg>
	);
}
