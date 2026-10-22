import type { Components } from 'react-markdown';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

import type { ManualKind } from '@/lib/docs/manual-help-targets';
import { cn } from '@/lib/utils';

function isMobileScreenshotSrc(src: string | undefined | null) {
	return typeof src === 'string' && /mobile/i.test(src);
}

const linkClassName = 'text-[#805b32] underline underline-offset-2';

/** App-relative paths (and same-origin absolute URLs) navigate in-tab like dashboard links. */
function isAppPathHref(href: string | undefined | null): boolean {
	if (!href) return false;
	if (href.startsWith('/')) return true;
	if (typeof window === 'undefined') return false;
	try {
		const url = new URL(href, window.location.origin);
		return url.origin === window.location.origin;
	} catch {
		return false;
	}
}

export const manualMarkdownComponents: Components = {
	h1: ({ children }) => (
		<h1 className="font-heading text-4xl text-[#805b32]">{children}</h1>
	),
	h2: ({ children }) => (
		<h2 className="mt-6 font-heading text-2xl text-[#805b32]">{children}</h2>
	),
	h3: ({ children }) => (
		<h3 className="mt-4 text-xl font-medium text-[#444]">{children}</h3>
	),
	h4: ({ children }) => (
		<h4 className="mt-4 text-lg font-medium text-[#444]">{children}</h4>
	),
	p: ({ children }) => (
		<p className="mt-3 text-base leading-relaxed text-[#2a2a2a]">{children}</p>
	),
	ul: ({ children }) => (
		<ul className="mt-3 list-disc space-y-2 pl-7 text-base text-[#2a2a2a]">
			{children}
		</ul>
	),
	ol: ({ children, start }) => (
		<ol
			start={start}
			className="mt-3 list-decimal space-y-2 pl-7 text-base text-[#2a2a2a]"
		>
			{children}
		</ol>
	),
	li: ({ children }) => <li className="leading-relaxed">{children}</li>,
	strong: ({ children }) => (
		<strong className="font-medium text-[#1a1a1a]">{children}</strong>
	),
	hr: () => <hr className="my-6 border-[#e5e5e5]" />,
	a: ({ href, children }) => {
		const isHash = href?.startsWith('#');
		const isAppPath = isAppPathHref(href);
		return (
			<a
				href={href}
				className={linkClassName}
				{...(isHash || isAppPath
					? {}
					: { target: '_blank', rel: 'noreferrer' })}
			>
				{children}
			</a>
		);
	},
	img: ({ src, alt }) => {
		if (typeof src !== 'string' || !src) return null;
		const resolved = src.startsWith('screenshots/')
			? `/docs/${src}`
			: src;
		const isMobile = isMobileScreenshotSrc(src);
		return (
			<Image
				src={resolved}
				alt={alt || ''}
				width={1600}
				height={1000}
				sizes="(max-width: 768px) 100vw, 48rem"
				{...(isMobile ? { 'data-manual-mobile': '' } : {})}
				className="mt-4 h-auto w-full max-w-3xl rounded-[2px] border border-[#e5e5e5] bg-white shadow-sm"
			/>
		);
	}
};

function buildMarkdownComponents(
	onHashNavigate?: (hash: string) => void
): Components {
	if (!onHashNavigate) return manualMarkdownComponents;

	return {
		...manualMarkdownComponents,
		a: ({ href, children }) => {
			const isHash = href?.startsWith('#');
			if (isHash && href) {
				const hash = href.slice(1);
				return (
					<a
						href={href}
						className={linkClassName}
						onClick={(event) => {
							event.preventDefault();
							onHashNavigate(hash);
						}}
					>
						{children}
					</a>
				);
			}
			const isAppPath = isAppPathHref(href);
			return (
				<a
					href={href}
					className={linkClassName}
					{...(isAppPath
						? {}
						: { target: '_blank', rel: 'noreferrer' })}
				>
					{children}
				</a>
			);
		}
	};
}

type ManualMarkdownBodyProps = {
	markdown: string;
	compact?: boolean;
	manualKind?: ManualKind;
	/** When set (help sheet), hash links open accordion sections instead of scrolling. */
	onHashNavigate?: (hash: string) => void;
};

export function ManualMarkdownBody({
	markdown,
	compact = false,
	manualKind,
	onHashNavigate
}: ManualMarkdownBodyProps) {
	if (!markdown.trim()) return null;

	const memberSheetMobile = compact && manualKind === 'member';
	const components = buildMarkdownComponents(onHashNavigate);

	return (
		<div
			className={cn(
				'user-manual-markdown',
				memberSheetMobile && 'user-manual-markdown--member-sheet'
			)}
		>
			<style>{`
				.user-manual-markdown p:has(> img:only-child) {
					margin-bottom: 60px;
				}
				.user-manual-markdown p:has(> img:only-child):has(+ p:has(> img:only-child)) {
					margin-bottom: 0.5rem;
				}
				${
					memberSheetMobile
						? `
				@media (max-width: 767px) {
					.user-manual-markdown--member-sheet p:has(> img:only-child:not([data-manual-mobile])) {
						display: none;
					}
					.user-manual-markdown--member-sheet img[data-manual-mobile] {
						aspect-ratio: 1 / 1;
						object-fit: cover;
						object-position: center;
						width: 100%;
						max-width: none;
					}
				}
				@media (min-width: 768px) {
					.user-manual-markdown--member-sheet p:has(> img[data-manual-mobile]:only-child) {
						display: none;
					}
				}
				`
						: ''
				}
			`}</style>
			<ReactMarkdown components={components}>{markdown}</ReactMarkdown>
		</div>
	);
}
