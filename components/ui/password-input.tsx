'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function PasswordInput({
	className,
	...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
	const [visible, setVisible] = React.useState(false)

	return (
		<div className="relative">
			<Input
				type={visible ? 'text' : 'password'}
				className={cn('pr-9', className)}
				{...props}
			/>
			<button
				type="button"
				className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
				onClick={() => setVisible((prev) => !prev)}
				aria-label={visible ? 'Hide password' : 'Show password'}
				aria-pressed={visible}
				disabled={props.disabled}
			>
				{visible ? (
					<EyeOff className="size-4" aria-hidden="true" />
				) : (
					<Eye className="size-4" aria-hidden="true" />
				)}
			</button>
		</div>
	)
}

export { PasswordInput }
