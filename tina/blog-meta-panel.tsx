'use client';

import {
	useEffect,
	useRef,
	useState,
	type ReactNode,
	type RefObject
} from 'react';
// Field components are available at runtime; package types omit some of them.
import { DateField, TextField, TextareaFieldPlugin } from 'tinacms';

const META_FIELDS = [
	'title',
	'author',
	'publishedAt',
	'shortDescription'
] as const;

type MetaFieldName = (typeof META_FIELDS)[number];

type TinaForm = {
	change?: (name: string, value: unknown) => void;
	getState?: () => { values?: Record<string, unknown> };
	subscribe?: (
		subscriber: (state: { values?: Record<string, unknown> }) => void,
		subscription: { values: boolean }
	) => () => void;
};

type FieldProps = {
	form?: TinaForm;
	tinaForm?: TinaForm;
	field?: { name?: string; experimental_focusIntent?: boolean };
	input: unknown;
	meta: unknown;
};

function getForm(props: FieldProps): TinaForm | undefined {
	return props.form ?? props.tinaForm;
}

function isMetaFieldName(value: string | undefined | null): value is MetaFieldName {
	return (
		typeof value === 'string' &&
		(META_FIELDS as readonly string[]).includes(value)
	);
}

/** Extract blog meta field name from Tina field paths / page selection ids. */
function resolveMetaFieldName(raw: string | undefined | null): MetaFieldName | null {
	if (!raw) return null;
	const path = raw.includes('---') ? raw.split('---')[1] ?? raw : raw;
	const segments = path.split('.').filter(Boolean);
	for (let i = segments.length - 1; i >= 0; i--) {
		if (isMetaFieldName(segments[i])) return segments[i];
	}
	return null;
}

export function isTinaVisualEditor(): boolean {
	if (typeof window === 'undefined') return false;
	return /#\/~\//.test(window.location.hash);
}

function useIsTinaVisualEditor(): boolean {
	const [isVisual, setIsVisual] = useState(false);

	useEffect(() => {
		const sync = () => setIsVisual(isTinaVisualEditor());
		sync();
		window.addEventListener('hashchange', sync);
		return () => window.removeEventListener('hashchange', sync);
	}, []);

	return isVisual;
}

function useFormValues(form: TinaForm | undefined): Record<string, unknown> {
	const [values, setValues] = useState<Record<string, unknown>>(
		() => form?.getState?.()?.values ?? {}
	);

	useEffect(() => {
		if (!form) return;

		setValues(form.getState?.()?.values ?? {});

		if (!form.subscribe) return;
		return form.subscribe(
			state => setValues(state.values ?? {}),
			{ values: true }
		);
	}, [form]);

	return values;
}

function toDateInputValue(value: unknown): string {
	if (typeof value !== 'string' || !value) return '';
	const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
	return match?.[1] ?? '';
}

type MetaFieldFocusListener = (field: MetaFieldName) => void;
const metaFieldFocusListeners = new Set<MetaFieldFocusListener>();

function requestMetaFieldFocus(field: MetaFieldName) {
	metaFieldFocusListeners.forEach(listener => listener(field));
}

function subscribeMetaFieldFocus(listener: MetaFieldFocusListener) {
	metaFieldFocusListeners.add(listener);
	return () => {
		metaFieldFocusListeners.delete(listener);
	};
}

function BlogCollapsedMetaPanelInner({ form }: { form: TinaForm }) {
	const values = useFormValues(form);
	const [open, setOpen] = useState(false);
	const [focusTarget, setFocusTarget] = useState<MetaFieldName | null>(null);

	const titleRef = useRef<HTMLInputElement>(null);
	const authorRef = useRef<HTMLInputElement>(null);
	const publishedAtRef = useRef<HTMLInputElement>(null);
	const shortDescriptionRef = useRef<HTMLTextAreaElement>(null);

	const refs: Record<MetaFieldName, RefObject<HTMLInputElement | HTMLTextAreaElement | null>> =
		{
			title: titleRef,
			author: authorRef,
			publishedAt: publishedAtRef,
			shortDescription: shortDescriptionRef
		};

	const focusField = (field: MetaFieldName) => {
		setOpen(true);
		setFocusTarget(field);
	};

	useEffect(() => subscribeMetaFieldFocus(focusField), []);

	// Page clicks in the Tina iframe post field:selected to the admin parent.
	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			if (event.data?.type !== 'field:selected') return;
			const field = resolveMetaFieldName(
				typeof event.data.fieldName === 'string' ? event.data.fieldName : null
			);
			if (field) focusField(field);
		};
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	}, []);

	useEffect(() => {
		if (!open || !focusTarget) return;
		const id = window.requestAnimationFrame(() => {
			const el = refs[focusTarget].current;
			if (!el) return;
			el.focus();
			el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			setFocusTarget(null);
		});
		return () => window.cancelAnimationFrame(id);
	}, [open, focusTarget]);

	const change = (name: string, value: unknown) => {
		form.change?.(name, value);
	};

	return (
		<details
			className="mb-4 rounded-md border border-gray-200 bg-white"
			open={open}
			onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}
		>
			<summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-800">
				Post details
				<span className="ml-2 font-normal text-gray-500">
					(title, author, date, description)
				</span>
			</summary>
			<div className="space-y-3 border-t border-gray-100 px-3 py-3">
				<label className="block text-sm">
					<span className="mb-1 block font-medium text-gray-700">Title</span>
					<input
						ref={titleRef}
						data-tinafield="title"
						type="text"
						className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
						value={typeof values.title === 'string' ? values.title : ''}
						onChange={e => change('title', e.target.value)}
					/>
				</label>
				<label className="block text-sm">
					<span className="mb-1 block font-medium text-gray-700">Author</span>
					<input
						ref={authorRef}
						data-tinafield="author"
						type="text"
						className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
						value={typeof values.author === 'string' ? values.author : ''}
						onChange={e => change('author', e.target.value)}
					/>
				</label>
				<label className="block text-sm">
					<span className="mb-1 block font-medium text-gray-700">
						Publishing date
					</span>
					<input
						ref={publishedAtRef}
						data-tinafield="publishedAt"
						type="date"
						className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
						value={toDateInputValue(values.publishedAt)}
						onChange={e => {
							const day = e.target.value;
							change(
								'publishedAt',
								day ? `${day}T12:00:00.000Z` : undefined
							);
						}}
					/>
				</label>
				<label className="block text-sm">
					<span className="mb-1 block font-medium text-gray-700">
						Short description
					</span>
					<textarea
						ref={shortDescriptionRef}
						data-tinafield="shortDescription"
						rows={3}
						className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
						value={
							typeof values.shortDescription === 'string'
								? values.shortDescription
								: ''
						}
						onChange={e => change('shortDescription', e.target.value)}
					/>
				</label>
			</div>
		</details>
	);
}

/** Sentinel field: only renders the collapsed Post details panel in the live editor. */
export function BlogCollapsedMetaPanel(props: FieldProps) {
	const isVisual = useIsTinaVisualEditor();
	const form = getForm(props);

	if (!isVisual || !form) return null;

	return <BlogCollapsedMetaPanelInner form={form} />;
}

function hideOnVisualEditor(
	DefaultField: (props: FieldProps) => ReactNode,
	metaField: MetaFieldName
) {
	return function VisualAwareField(props: FieldProps) {
		const isVisual = useIsTinaVisualEditor();
		const focusIntent = Boolean(props.field?.experimental_focusIntent);

		useEffect(() => {
			if (isVisual && focusIntent) {
				requestMetaFieldFocus(metaField);
			}
		}, [isVisual, focusIntent]);

		if (isVisual) {
			// Keep a form-side marker so Tina can resolve the active field target.
			return (
				<div
					data-tinafield={metaField}
					className="hidden"
					aria-hidden
				/>
			);
		}

		return <DefaultField {...props} />;
	};
}

const TextareaField = TextareaFieldPlugin.Component as unknown as (
	props: FieldProps
) => ReactNode;

export const BlogTitleField = hideOnVisualEditor(
	TextField as unknown as (props: FieldProps) => ReactNode,
	'title'
);
export const BlogAuthorField = hideOnVisualEditor(
	TextField as unknown as (props: FieldProps) => ReactNode,
	'author'
);
export const BlogPublishedAtField = hideOnVisualEditor(
	DateField as unknown as (props: FieldProps) => ReactNode,
	'publishedAt'
);
export const BlogShortDescriptionField = hideOnVisualEditor(
	TextareaField,
	'shortDescription'
);
