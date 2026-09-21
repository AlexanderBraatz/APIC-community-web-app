'use client';

import { useFormStatus } from 'react-dom';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';

type SubmitButtonProps = Omit<
	ComponentProps<typeof Button>,
	'type' | 'loading'
> & {
	/** Extra loading flag combined with form pending state. */
	loading?: boolean;
};

export function SubmitButton({
	loading = false,
	disabled,
	...props
}: SubmitButtonProps) {
	const { pending } = useFormStatus();
	const isLoading = pending || loading;

	return (
		<Button
			type="submit"
			loading={isLoading}
			disabled={disabled || isLoading}
			{...props}
		/>
	);
}
