export default function Byline(props: {
	children: React.ReactNode;
	className?: string;
	fieldName?: string;
}) {
	return (
		<div
			data-tina-field={props.fieldName}
			className={`flex w-full items-center gap-2 ${props.className}`}
		>
			<div className="h-2 w-full border-l border-t border-primary opacity-40" />
			<h2 className="relative whitespace-pre pb-2 text-xs font-semibold uppercase leading-7 tracking-wider text-primary">
				{props.children}
			</h2>
		</div>
	);
}
