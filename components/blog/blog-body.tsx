import type { ReactNode } from 'react';
import Image from 'next/image';
import { isEmptyBlogBody } from '@/lib/blog/body';
import { getBlogThumbnailUrl } from '@/lib/blog/thumbnail';
import type { Json } from '@/lib/supabase/database.types';

type TipTapMark = {
	type?: string;
	attrs?: Record<string, unknown>;
};

type TipTapNode = {
	type?: string;
	text?: string;
	content?: TipTapNode[];
	marks?: TipTapMark[];
	attrs?: Record<string, unknown>;
};

function asNode(value: Json | undefined): TipTapNode | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as TipTapNode;
}

function sanitizeHref(href: unknown): string | null {
	if (typeof href !== 'string') return null;
	const trimmed = href.trim();
	if (!trimmed) return null;
	const lower = trimmed.toLowerCase();
	if (
		lower.startsWith('https://') ||
		lower.startsWith('http://') ||
		lower.startsWith('mailto:')
	) {
		return trimmed;
	}
	return null;
}

function applyMarks(text: string, marks: TipTapMark[] | undefined, key: string): ReactNode {
	let node: ReactNode = text;
	if (!marks?.length) {
		return <span key={key}>{node}</span>;
	}

	for (const mark of marks) {
		switch (mark.type) {
			case 'bold':
				node = <strong key={`${key}-bold`}>{node}</strong>;
				break;
			case 'italic':
				node = <em key={`${key}-italic`}>{node}</em>;
				break;
			case 'link': {
				const href = sanitizeHref(mark.attrs?.href);
				if (!href) break;
				node = (
					<a
						key={`${key}-link`}
						href={href}
						className="text-[#805b32] underline underline-offset-2 hover:text-[#6a4a28]"
						rel="noopener noreferrer"
						target={href.startsWith('mailto:') ? undefined : '_blank'}
					>
						{node}
					</a>
				);
				break;
			}
			default:
				break;
		}
	}

	return <span key={key}>{node}</span>;
}

function renderNode(node: TipTapNode, key: string): ReactNode {
	switch (node.type) {
		case 'doc':
			return (
				<div key={key}>
					{(node.content ?? []).map((child, i) =>
						renderNode(child, `${key}-${i}`)
					)}
				</div>
			);
		case 'paragraph': {
			const children = (node.content ?? []).map((child, i) =>
				renderNode(child, `${key}-${i}`)
			);
			return (
				<p
					key={key}
					className="mb-4 font-sans text-base leading-relaxed text-[#555555] last:mb-0"
				>
					{children.length > 0 ? children : '\u00A0'}
				</p>
			);
		}
		case 'heading': {
			const level = Number(node.attrs?.level ?? 2);
			const children = (node.content ?? []).map((child, i) =>
				renderNode(child, `${key}-${i}`)
			);
			if (level >= 3) {
				return (
					<h3
						key={key}
						className="mb-4 font-heading text-2xl font-normal text-[#333333]"
					>
						{children}
					</h3>
				);
			}
			return (
				<h2
					key={key}
					className="mb-4 font-heading text-3xl font-normal text-[#333333]"
				>
					{children}
				</h2>
			);
		}
		case 'bulletList':
			return (
				<ul
					key={key}
					className="mb-4 list-disc space-y-1 pl-6 font-sans text-base text-[#555555]"
				>
					{(node.content ?? []).map((child, i) =>
						renderNode(child, `${key}-${i}`)
					)}
				</ul>
			);
		case 'orderedList':
			return (
				<ol
					key={key}
					className="mb-4 list-decimal space-y-1 pl-6 font-sans text-base text-[#555555]"
				>
					{(node.content ?? []).map((child, i) =>
						renderNode(child, `${key}-${i}`)
					)}
				</ol>
			);
		case 'listItem':
			return (
				<li key={key}>
					{(node.content ?? []).map((child, i) =>
						renderNode(child, `${key}-${i}`)
					)}
				</li>
			);
		case 'image': {
			const rawSrc =
				typeof node.attrs?.src === 'string' ? node.attrs.src.trim() : '';
			const path =
				typeof node.attrs?.path === 'string' ? node.attrs.path.trim() : '';
			const src = rawSrc || getBlogThumbnailUrl(path) || '';
			if (!src) return null;
			const alt =
				typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
			return (
				<figure
					key={key}
					className="my-6"
				>
					<Image
						src={src}
						alt={alt}
						width={768}
						height={512}
						className="h-auto w-full object-cover"
						sizes="(min-width: 860px) 769px, 92.78vw"
					/>
				</figure>
			);
		}
		case 'text':
			return applyMarks(node.text ?? '', node.marks, key);
		case 'hardBreak':
			return <br key={key} />;
		default:
			// Ignore unknown node types (and their children).
			return null;
	}
}

/**
 * TipTap-JSON walker for public articles and the admin preview.
 * Only known nodes/marks are rendered; links restricted to http(s)/mailto.
 */
export default function BlogBody({ body }: { body: Json }) {
	if (isEmptyBlogBody(body)) {
		return (
			<section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl">
					<p className="font-sans text-base italic leading-relaxed text-[#888888]">
						Content coming soon.
					</p>
				</div>
			</section>
		);
	}

	const root = asNode(body);
	if (!root) {
		return (
			<section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl">
					<p className="font-sans text-base italic leading-relaxed text-[#888888]">
						Content coming soon.
					</p>
				</div>
			</section>
		);
	}

	return (
		<section className="bg-white px-4 pb-14 pt-4 sm:px-6 lg:px-8 lg:pb-20">
			<div className="mx-auto max-w-3xl break-words">
				{renderNode(root, 'root')}
			</div>
		</section>
	);
}
