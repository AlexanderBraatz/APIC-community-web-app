'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function parseYmd(value: string): Date | undefined {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
	const [year, month, day] = value.split('-').map(Number)
	// Midday local avoids DST / timezone day-shift vs UTC midnight parsing.
	return new Date(year, month - 1, day, 12, 0, 0, 0)
}

type DatePickerFieldProps = {
	id?: string
	value: string
	onChange: (value: string) => void
	min?: string
	max?: string
	className?: string
	disabled?: boolean
	placeholder?: string
	required?: boolean
}

function DatePickerField({
	id,
	value,
	onChange,
	min,
	max,
	className,
	disabled,
	placeholder = 'Pick a date',
	required,
}: DatePickerFieldProps) {
	const [open, setOpen] = React.useState(false)
	const selected = parseYmd(value)

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			<PopoverTrigger
				render={
					<Button
						id={id}
						type="button"
						variant="outline"
						disabled={disabled}
						aria-required={required || undefined}
						data-empty={!selected}
						className={cn(
							'h-8 w-full min-w-0 justify-start gap-2 px-2.5 font-normal text-base data-[empty=true]:text-muted-foreground',
							className
						)}
					/>
				}
			>
				<CalendarIcon className="size-4 shrink-0 opacity-70" />
				<span className="truncate">
					{selected ? format(selected, 'd MMM yyyy') : placeholder}
				</span>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-auto p-0"
			>
				<Calendar
					mode="single"
					selected={selected}
					defaultMonth={selected}
					disabled={date => {
						const ymd = format(date, 'yyyy-MM-dd')
						if (min && ymd < min) return true
						if (max && ymd > max) return true
						return false
					}}
					onSelect={date => {
						if (!date) return
						onChange(format(date, 'yyyy-MM-dd'))
						setOpen(false)
					}}
				/>
			</PopoverContent>
		</Popover>
	)
}

export { DatePickerField }
