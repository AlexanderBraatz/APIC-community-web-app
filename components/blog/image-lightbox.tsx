'use client';

import {
	Carousel,
	CarouselContent,
	CarouselItem,
	type CarouselApi
} from '@/components/ui/carousel';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
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
	const [api, setApi] = useState<CarouselApi>();

	const goPrev = () => {
		if (!hasMultiple) return;
		api?.scrollPrev();
	};

	const goNext = () => {
		if (!hasMultiple) return;
		api?.scrollNext();
	};

	const syncIndexFromApi = useEffectEvent((carouselApi: NonNullable<CarouselApi>) => {
		onIndexChange(carouselApi.selectedScrollSnap());
	});

	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onClose();
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			event.stopPropagation();
			if (!hasMultiple) return;
			api?.scrollPrev();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			event.stopPropagation();
			if (!hasMultiple) return;
			api?.scrollNext();
		}
	});

	useEffect(() => {
		if (!api) return;

		const onSelect = () => {
			syncIndexFromApi(api);
		};

		onSelect();
		api.on('select', onSelect);
		api.on('reInit', onSelect);

		return () => {
			api.off('select', onSelect);
			api.off('reInit', onSelect);
		};
	}, [api]);

	useEffect(() => {
		if (!api || !open) return;
		if (api.selectedScrollSnap() !== index) {
			api.scrollTo(index, true);
		}
	}, [api, open, index]);

	useEffect(() => {
		if (!open) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		// Capture phase so Embla/shadcn carousel key handlers do not double-step.
		window.addEventListener('keydown', onKeyDown, true);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', onKeyDown, true);
		};
	}, [open]);

	if (!open || !current || typeof document === 'undefined') return null;

	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			aria-label={current.caption || current.alt || 'Image viewer'}
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/85"
			onClick={onClose}
		>
			<LightboxControl
				label="Close"
				onClick={onClose}
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
					{hasMultiple ? (
						<Carousel
							setApi={setApi}
							opts={{ loop: true, startIndex: index }}
							className="h-full w-full"
						>
							<CarouselContent className="ml-0">
								{images.map((image, i) => (
									<CarouselItem
										key={`${image.src}-${i}`}
										className="relative h-full pl-0"
									>
										<Image
											fill
											src={image.src}
											alt={image.alt || image.caption || ''}
											sizes="100vw"
											className="object-contain"
											priority={i === index}
										/>
									</CarouselItem>
								))}
							</CarouselContent>
						</Carousel>
					) : (
						<Image
							fill
							src={current.src}
							alt={current.alt || current.caption || ''}
							sizes="100vw"
							className="object-contain"
						/>
					)}
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
