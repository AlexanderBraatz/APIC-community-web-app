'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Sheet({ ...props }: DrawerPrimitive.Root.Props) {
	return <DrawerPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
	return <DrawerPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetPortal({ ...props }: DrawerPrimitive.Portal.Props) {
	return <DrawerPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetClose({ ...props }: DrawerPrimitive.Close.Props) {
	return <DrawerPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
	className,
	...props
}: DrawerPrimitive.Backdrop.Props) {
	return (
		<DrawerPrimitive.Backdrop
			data-slot="sheet-overlay"
			className={cn(
				'fixed inset-0 z-50 bg-black/10 duration-200 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
				className
			)}
			{...props}
		/>
	);
}

function SheetContent({
	className,
	children,
	showCloseButton = true,
	showOverlay = true,
	...props
}: DrawerPrimitive.Popup.Props & {
	showCloseButton?: boolean;
	/** Dimmed backdrop. Set false for non-modal sheets that leave the page usable. */
	showOverlay?: boolean;
}) {
	return (
		<SheetPortal>
			{showOverlay ? <SheetOverlay /> : null}
			<DrawerPrimitive.Viewport
				data-slot="sheet-viewport"
				className={cn(
					'fixed inset-0 z-50 flex justify-end',
					!showOverlay && 'pointer-events-none'
				)}
			>
				<DrawerPrimitive.Popup
					data-slot="sheet-content"
					className={cn(
						// Use the `transform` property (not Tailwind translate-*) so it shares
						// one channel with Base UI's inline swipe transform and
						// --drawer-swipe-movement-x handoff. Avoids snap-back flash on dismiss.
						'relative flex h-full w-full max-w-lg flex-col bg-white text-sm text-[#444] shadow-lg outline-none',
						'transform-[translateX(var(--drawer-swipe-movement-x,0px))] transition-[transform,opacity] duration-300 ease-out',
						'data-starting-style:transform-[translateX(100%)] data-starting-style:opacity-0',
						'data-ending-style:transform-[translateX(100%)] data-ending-style:opacity-0',
						'data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*300ms)]',
						'data-swiping:duration-0',
						!showOverlay && 'pointer-events-auto',
						className
					)}
					{...props}
				>
					{children}
					{showCloseButton ? (
						<DrawerPrimitive.Close
							data-slot="sheet-close"
							render={
								<Button
									variant="ghost"
									className="absolute top-3 right-3"
									size="icon-sm"
								/>
							}
						>
							<XIcon />
							<span className="sr-only">Close</span>
						</DrawerPrimitive.Close>
					) : null}
				</DrawerPrimitive.Popup>
			</DrawerPrimitive.Viewport>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sheet-header"
			className={cn(
				'flex flex-col gap-1 border-b border-[#e5e5e5] px-5 py-4 pr-12',
				className
			)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
	return (
		<DrawerPrimitive.Title
			data-slot="sheet-title"
			className={cn(
				'font-heading text-xl leading-none font-medium text-[#805b32]',
				className
			)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: DrawerPrimitive.Description.Props) {
	return (
		<DrawerPrimitive.Description
			data-slot="sheet-description"
			className={cn('text-sm text-[#666]', className)}
			{...props}
		/>
	);
}

function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sheet-body"
			// Opt out of Drawer swipe so vertical scroll is not stolen on side sheets
			// (swipeDirection=right only mediates horizontal nested scrollers).
			data-base-ui-swipe-ignore=""
			className={cn(
				'flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-4',
				className
			)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger
};
