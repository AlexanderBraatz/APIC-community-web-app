'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type LightboxImage = {
	src: string;
	alt?: string;
	caption?: string;
};

type ImageLightboxProps = {
	images: LightboxImage[];
	index: number;
	open: boolean;
	onClose: () => void;
	onIndexChange: (index: number) => void;
};

function LightboxControl({
	label,
	onClick,
	className,
	children
}: {
	label: string;
	onClick: () => void;
	className: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={event => {
				event.stopPropagation();
				onClick();
			}}
			className={`group absolute z-10 flex items-center justify-center ${className}`}
		>
			<span className="flex items-center justify-center rounded-full bg-black/40 p-2.5 text-white transition-transform duration-150 group-hover:scale-120">
				{children}
			</span>
		</button>
	);
}

export default function ImageLightbox({
	images,
	index,
	open,
	onClose,
	onIndexChange
}: ImageLightboxProps) {
	const hasMultiple = images.length > 1;
	const current = images[index];

	const goPrev = useEffectEvent(() => {
		if (!hasMultiple) return;
		onIndexChange((index - 1 + images.length) % images.length);
	});

	const goNext = useEffectEvent(() => {
		if (!hasMultiple) return;
		onIndexChange((index + 1) % images.length);
	});

	const close = useEffectEvent(() => {
		onClose();
	});

	useEffect(() => {
		if (!open) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				close();
			} else if (event.key === 'ArrowLeft') {
				event.preventDefault();
				goPrev();
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				goNext();
			}
		};

		window.addEventListener('keydown', onKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	if (!open || !current || typeof document === 'undefined') return null;

	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			aria-label={current.caption || current.alt || 'Image viewer'}
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/85"
			onClick={close}
		>
			<LightboxControl
				label="Close"
				onClick={close}
				className="right-1 top-1 size-14 sm:right-3 sm:top-3 sm:size-16"
			>
				<X
					className="size-6"
					strokeWidth={1.75}
				/>
			</LightboxControl>

			{hasMultiple ? (
				<LightboxControl
					label="Previous image"
					onClick={goPrev}
					className="left-0 top-1/2 size-16 -translate-y-1/2 sm:left-2 sm:size-20 lg:left-4"
				>
					<ChevronLeft
						className="size-7 sm:size-8"
						strokeWidth={1.5}
					/>
				</LightboxControl>
			) : null}

			{hasMultiple ? (
				<LightboxControl
					label="Next image"
					onClick={goNext}
					className="right-0 top-1/2 size-16 -translate-y-1/2 sm:right-2 sm:size-20 lg:right-4"
				>
					<ChevronRight
						className="size-7 sm:size-8"
						strokeWidth={1.5}
					/>
				</LightboxControl>
			) : null}

			<figure className="pointer-events-none flex h-full w-full flex-col items-center justify-center px-4 py-14 sm:px-10 sm:py-16 lg:px-20 lg:py-20">
				<div
					className="pointer-events-auto relative min-h-0 w-full flex-1"
					onClick={event => event.stopPropagation()}
				>
					<Image
						fill
						src={current.src}
						alt={current.alt || current.caption || ''}
						sizes="100vw"
						className="object-contain"
					/>
				</div>
				{current.caption ? (
					<figcaption className="mt-4 max-w-3xl shrink-0 text-center font-heading text-sm text-white/80 sm:text-base">
						{current.caption}
					</figcaption>
				) : null}
				{hasMultiple ? (
					<p className="mt-3 shrink-0 text-xs text-white/55">
						{index + 1} / {images.length}
					</p>
				) : null}
			</figure>
		</div>,
		document.body
	);
}
