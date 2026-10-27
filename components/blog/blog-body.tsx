import type { ReactNode } from 'react';
import type { Json } from '@/lib/supabase/database.types';

type TipTapNode = {
	type?: string;
	text?: string;
	content?: TipTapNode[];
	attrs?: Record<string, unknown>;
};

function asNode(value: Json | undefined): TipTapNode | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as TipTapNode;
}

function isEmptyBody(body: Json): boolean {
	if (body == null) return true;
	if (typeof body !== 'object') return true;
	if (Array.isArray(body)) return body.length === 0;
	const keys = Object.keys(body);
	if (keys.length === 0) return true;
	const doc = body as TipTapNode;
	if (doc.type === 'doc') {
		const content = doc.content;
		if (!content || content.length === 0) return true;
	}
	return false;
}

function collectText(node: TipTapNode | null): string {
	if (!node) return '';
	if (typeof node.text === 'string') return node.text;
	if (!node.content?.length) return '';
	return node.content.map(collectText).join('');
}

function renderNode(node: TipTapNode, key: string): ReactNode {
	const children = (node.content ?? []).map((child, i) =>
		renderNode(child, `${key}-${i}`)
	);

	switch (node.type) {
		case 'doc':
			return <div key={key}>{children}</div>;
		case 'paragraph':
			return (
				<p
					key={key}
					className="mb-4 font-sans text-base leading-relaxed text-[#555555] last:mb-0"
				>
					{children.length > 0 ? children : '\u00A0'}
				</p>
			);
		case 'heading': {
			const level = Number(node.attrs?.level ?? 2);
			const className =
				'mb-4 font-heading font-normal text-[#333333] ' +
				(level >= 3 ? 'text-2xl' : 'text-3xl');
			if (level >= 3) {
				return (
					<h3
						key={key}
						className={className}
					>
						{children}
					</h3>
				);
			}
			return (
				<h2
					key={key}
					className={className}
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
					{children}
				</ul>
			);
		case 'orderedList':
			return (
				<ol
					key={key}
					className="mb-4 list-decimal space-y-1 pl-6 font-sans text-base text-[#555555]"
				>
					{children}
				</ol>
			);
		case 'listItem':
			return <li key={key}>{children}</li>;
		case 'text':
			return <span key={key}>{node.text ?? ''}</span>;
		case 'hardBreak':
			return <br key={key} />;
		default: {
			const text = collectText(node).trim();
			if (!text) return null;
			return (
				<p
					key={key}
					className="mb-4 font-sans text-base leading-relaxed text-[#555555]"
				>
					{text}
				</p>
			);
		}
	}
}

/**
 * Minimal TipTap-JSON walker for Stage 2.
 * Full renderer lands in Stage 5; empty bodies show a placeholder.
 */
export default function BlogBody({ body }: { body: Json }) {
	if (isEmptyBody(body)) {
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
			<div className="mx-auto max-w-3xl">{renderNode(root, 'root')}</div>
		</section>
	);
}
