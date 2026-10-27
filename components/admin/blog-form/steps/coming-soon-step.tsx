'use client';

type ComingSoonStepProps = {
	title: string;
	description: string;
};

export default function ComingSoonStep({
	title,
	description
}: ComingSoonStepProps) {
	return (
		<section className="space-y-4 border border-dashed border-[#b8a99a]/50 bg-[#faf7f2] px-5 py-8">
			<p className="text-xs font-medium tracking-wide text-[#805b32] uppercase">
				Coming in Stage 5
			</p>
			<h3 className="font-heading text-2xl font-normal text-[#333333]">
				{title}
			</h3>
			<p className="max-w-prose text-sm leading-relaxed text-[#666]">
				{description}
			</p>
		</section>
	);
}
