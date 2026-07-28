export default function StarDivider() {
	return (
		<div
			className="my-10 flex items-center gap-0"
			aria-hidden="true"
		>
			<div className="h-px flex-1 bg-[#b8a99a]" />
			<svg
				viewBox="0 0 24 24"
				className="mx-3 size-3 shrink-0 fill-[#c41e3a]"
			>
				<path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
			</svg>
			<div className="h-px flex-1 bg-[#b8a99a]" />
		</div>
	);
}
