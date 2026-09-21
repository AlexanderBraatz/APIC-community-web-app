'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { Loader2 } from 'lucide-react';

import {
	buttonVariants,
	type ButtonVariantProps
} from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

function Button({
	className,
	variant = 'default',
	size = 'default',
	loading = false,
	disabled,
	children,
	...props
}: ButtonPrimitive.Props &
	ButtonVariantProps & {
		loading?: boolean;
	}) {
	const isDisabled = Boolean(disabled || loading);

	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
			disabled={isDisabled}
			aria-busy={loading || undefined}
			aria-disabled={isDisabled || undefined}
		>
			{loading ? (
				<Loader2 className="animate-spin" aria-hidden />
			) : (
				children
			)}
		</ButtonPrimitive>
	);
}

export { Button, buttonVariants };
