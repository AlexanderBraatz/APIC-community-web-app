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
	/** Step indexes that were skipped — muted, not shown as completed. Still clickable. */
	skippedSteps?: number[];
};

const LG_MIN_WIDTH = '(min-width: 1024px)';

export default function StepperNav({
	steps,
	currentStep,
	onStepSelect,
	skippedSteps
}: StepperNavProps) {
	const listRef = useRef<HTMLOListElement>(null);
	const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
	const skipped = new Set(skippedSteps ?? []);

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
					const isSkipped = skipped.has(index);
					const isCompleted = !isSkipped && index < currentStep;
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
									isActive
										? 'text-[#444]'
										: isSkipped
											? 'text-[#b0a89e]'
											: 'text-[#666]'
								)}
							>
								<span className="flex w-8 shrink-0 flex-col items-center">
									<span
										className={cn(
											'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors',
											isActive
												? 'border-[#805b32] bg-[#805b32] text-white'
												: isCompleted
													? 'border-[#805b32] bg-[#805b32] text-white'
													: isSkipped
														? 'border-[#d4cbc0] bg-[#f0ebe4] text-[#b0a89e]'
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
											className={cn(
												'hidden w-px min-h-4 flex-1 lg:block',
												isSkipped
													? 'bg-[#d4cbc0]/70'
													: 'bg-[#b8a99a]/50'
											)}
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
