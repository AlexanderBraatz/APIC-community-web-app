import type { ReactNode } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';

function slugifyHeading(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/['']/g, '')
		// Keep letters from any language (ä, ö, ü, ß, …) so TOC hashes match heading ids.
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

function textFromChildren(children: ReactNode): string {
	if (typeof children === 'string' || typeof children === 'number') {
		return String(children);
	}
	if (Array.isArray(children)) {
		return children.map(textFromChildren).join('');
	}
	if (children && typeof children === 'object' && 'props' in children) {
		return textFromChildren(
			(children as { props?: { children?: ReactNode } }).props?.children
		);
	}
	return '';
}

const components: Components = {
	h1: ({ children }) => (
		<h1 className="font-heading text-4xl text-[#805b32]">{children}</h1>
	),
	h2: ({ children }) => {
		const text = textFromChildren(children);
		const id = slugifyHeading(text);
		return (
			<h2
				id={id}
				className="mt-12 scroll-mt-24 border-t border-[#e5e5e5] pt-8 font-heading text-3xl text-[#805b32]"
			>
				{children}
			</h2>
		);
	},
	h3: ({ children }) => {
		const text = textFromChildren(children);
		const id = slugifyHeading(text);
		return (
			<h3
				id={id}
				className="mt-8 scroll-mt-24 text-xl font-medium text-[#444]"
			>
				{children}
			</h3>
		);
	},
	h4: ({ children }) => {
		const text = textFromChildren(children);
		const id = slugifyHeading(text);
		return (
			<h4
				id={id}
				className="mt-6 scroll-mt-24 text-lg font-medium text-[#444]"
			>
				{children}
			</h4>
		);
	},
	p: ({ children }) => (
		<p className="mt-3 text-base leading-relaxed text-[#666]">{children}</p>
	),
	ul: ({ children }) => (
		<ul className="mt-3 list-disc space-y-2 pl-5 text-base text-[#666]">
			{children}
		</ul>
	),
	ol: ({ children, start }) => (
		<ol
			start={start}
			className="mt-3 list-decimal space-y-2 pl-5 text-base text-[#666]"
		>
			{children}
		</ol>
	),
	li: ({ children }) => <li className="leading-relaxed">{children}</li>,
	strong: ({ children }) => (
		<strong className="font-medium text-[#444]">{children}</strong>
	),
	hr: () => <hr className="my-10 border-[#e5e5e5]" />,
	a: ({ href, children }) => {
		const isHash = href?.startsWith('#');
		return (
			<a
				href={href}
				className="text-[#805b32] underline underline-offset-2"
				{...(isHash ? {} : { target: '_blank', rel: 'noreferrer' })}
			>
				{children}
			</a>
		);
	},
	img: ({ src, alt }) => {
		const resolved =
			typeof src === 'string' && src.startsWith('screenshots/')
				? `/account/user-manuals/${src}`
				: src;
		if (!resolved) return null;
		return (
			// Manual screenshots are static PNGs from docs/; next/image not needed.
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={resolved}
				alt={alt || ''}
				className="mt-4 w-full max-w-3xl rounded-[2px] border border-[#e5e5e5] bg-white shadow-sm"
			/>
		);
	}
};

export function UserManualMarkdown({ markdown }: { markdown: string }) {
	return (
		<div className="user-manual-markdown">
			{/* Space under each screenshot so the next bullet group clearly belongs to the image below it.
			    Consecutive image paragraphs (desktop + mobile) stay tightly stacked. */}
			<style>{`
				.user-manual-markdown p:has(> img:only-child) {
					margin-bottom: 60px;
				}
				.user-manual-markdown p:has(> img:only-child):has(+ p:has(> img:only-child)) {
					margin-bottom: 0.5rem;
				}
			`}</style>
			<ReactMarkdown components={components}>{markdown}</ReactMarkdown>
		</div>
	);
}
