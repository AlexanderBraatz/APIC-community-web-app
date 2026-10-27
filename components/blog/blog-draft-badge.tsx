export default function BlogDraftBadge({ className }: { className?: string }) {
	return (
		<span
			className={
				className ??
				'inline-flex max-w-full items-center rounded-xs border border-[#c4a574] bg-[#f7f0e4] px-2.5 py-1 font-sans text-xs font-medium leading-snug text-[#7A5A32]'
			}
		>
			This is a Draft, only admins can see this article
		</span>
	);
}
