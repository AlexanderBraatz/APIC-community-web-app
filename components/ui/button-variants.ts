import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
	"group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[2px] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color] duration-100 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					'border-[#634627] bg-[#805b32] text-white hover:border-[#0a0f0b] hover:bg-[#1f2d22]',
				outline:
					'border-[#634627] bg-transparent text-[#805b32] hover:bg-[#f7f2ec]',
				secondary:
					'border-[#d4a05a] bg-[#f7bc74] text-black hover:bg-[#f0a84f]',
				ghost:
					'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
				destructive:
					'border-red-800 bg-red-700 text-white hover:bg-red-800',
				link: 'border-transparent text-[#805b32] underline-offset-4 hover:underline'
			},
			size: {
				default:
					'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
				xs: "h-6 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1 px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
				lg: 'h-11 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
				icon: 'size-10',
				'icon-xs':
					"size-6 [&_svg:not([class*='size-'])]:size-3",
				'icon-sm': 'size-8',
				'icon-lg': 'size-11'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export { buttonVariants, type ButtonVariantProps };
