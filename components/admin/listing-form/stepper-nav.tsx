'use client';

import { Check } from 'lucide-react';
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

export default function StepperNav({
	steps,
	currentStep,
	onStepSelect
}: StepperNavProps) {
	return (
		<nav
			aria-label="Listing form steps"
			className="w-full lg:w-56 lg:shrink-0"
		>
			<ol className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
				{steps.map((step, index) => {
					const isActive = index === currentStep;
					const isCompleted = index < currentStep;
					const isLast = index === steps.length - 1;

					return (
						<li
							key={step.id}
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
