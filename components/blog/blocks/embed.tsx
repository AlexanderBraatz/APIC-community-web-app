'use client';

import { BlogBlocksEmbed } from '@/tina/__generated__/types';
import { tinaField } from 'tinacms/tina-field';

function toEmbedSrc(url: string): string | null {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.replace(/^www\./, '');

		if (host === 'youtu.be') {
			const id = parsed.pathname.slice(1);
			return id ? `https://www.youtube.com/embed/${id}` : null;
		}

		if (host === 'youtube.com' || host === 'm.youtube.com') {
			const id = parsed.searchParams.get('v');
			if (id) return `https://www.youtube.com/embed/${id}`;
			const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/);
			if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;
			return null;
		}

		if (host === 'vimeo.com') {
			const id = parsed.pathname.split('/').filter(Boolean)[0];
			return id ? `https://player.vimeo.com/video/${id}` : null;
		}

		return null;
	} catch {
		return null;
	}
}

export default function BlogEmbed(props: BlogBlocksEmbed) {
	if (!props.url) return null;

	const embedSrc = toEmbedSrc(props.url);

	return (
		<section className="bg-white px-4 py-8 sm:px-6 lg:px-8">
			<figure className="mx-auto max-w-3xl">
				{embedSrc ? (
					<div
						className="aspect-video overflow-hidden bg-[#f7f4ef]"
						data-tina-field={tinaField(props, 'url')}
					>
						<iframe
							src={embedSrc}
							title={props.caption || 'Embedded media'}
							className="size-full"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
						/>
					</div>
				) : (
					<a
						href={props.url}
						target="_blank"
						rel="noopener noreferrer"
						data-tina-field={tinaField(props, 'url')}
						className="inline-flex break-all text-[#805b32] underline underline-offset-2"
					>
						{props.url}
					</a>
				)}
				{props.caption ? (
					<figcaption
						data-tina-field={tinaField(props, 'caption')}
						className="mt-3 text-center font-heading text-sm text-[#666666]"
					>
						{props.caption}
					</figcaption>
				) : null}
			</figure>
		</section>
	);
}
