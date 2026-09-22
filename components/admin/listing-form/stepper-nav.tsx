'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type StepperStep = {
	id: string;
	label: string;
};

type StepperNavProps = {
	steps: StepperStep[];
	currentStep: number;
	onStepSelect: (index: number) => void;
};

const LG_MIN_WIDTH = '(min-width: 1024px)';

export default function StepperNav({
	steps,
	currentStep,
	onStepSelect
}: StepperNavProps) {
	const listRef = useRef<HTMLOListElement>(null);
	const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (window.matchMedia(LG_MIN_WIDTH).matches) return;

		const list = listRef.current;
		const step = stepRefs.current[currentStep];
		if (!list || !step) return;

		const listRect = list.getBoundingClientRect();
		const stepRect = step.getBoundingClientRect();
		const nextLeft = list.scrollLeft + (stepRect.left - listRect.left);

		list.scrollTo({ left: Math.max(0, nextLeft), behavior: 'smooth' });
	}, [currentStep]);

	return (
		<nav
			aria-label="Recommendation form steps"
			className="w-full lg:w-56 lg:shrink-0"
		>
			<ol
				ref={listRef}
				className="flex flex-row gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0"
			>
				{steps.map((step, index) => {
					const isActive = index === currentStep;
					const isCompleted = index < currentStep;
					const isLast = index === steps.length - 1;

					return (
						<li
							key={step.id}
							ref={el => {
								stepRefs.current[index] = el;
							}}
							className="flex shrink-0 lg:w-full lg:shrink"
						>
							<button
								type="button"
								onClick={() => onStepSelect(index)}
								aria-current={isActive ? 'step' : undefined}
								className={cn(
									'flex w-full gap-3 text-left transition-colors',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#805b32]/40',
									isActive ? 'text-[#444]' : 'text-[#666]'
								)}
							>
								<span className="flex w-8 shrink-0 flex-col items-center">
									<span
										className={cn(
											'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors',
											isActive || isCompleted
												? 'border-[#805b32] bg-[#805b32] text-white'
												: 'border-[#b8a99a] bg-background text-[#666]'
										)}
									>
										{isCompleted ? (
											<Check
												className="size-4"
												aria-hidden="true"
											/>
										) : (
											index + 1
										)}
									</span>
									{!isLast ? (
										<span
											aria-hidden="true"
											className="hidden w-px min-h-4 flex-1 bg-[#b8a99a]/50 lg:block"
										/>
									) : null}
								</span>
								<span
									className={cn(
										'pt-1.5 text-sm whitespace-nowrap lg:whitespace-normal',
										isActive ? 'font-medium' : 'font-normal',
										!isLast && 'lg:pb-6'
									)}
								>
									{step.label}
								</span>
							</button>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
