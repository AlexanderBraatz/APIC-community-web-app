'use client';

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type ReactNode
} from 'react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
	Bold,
	Heading2,
	Heading3,
	ImageIcon,
	Italic,
	Link2,
	List,
	ListOrdered,
	Pilcrow
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadBlogImage } from '@/lib/blog/admin-actions';
import {
	BLOG_IMAGE_TOO_LARGE_MESSAGE,
	compressBlogImage,
	friendlyBlogImageUploadError,
	isBlogImageTooLarge
} from '@/lib/blog/compress-image';
import { toPlainBlogBody } from '@/components/admin/blog-form/constants';
import type { Json } from '@/lib/supabase/database.types';

type BodyStepProps = {
	postId: string;
	body: Json;
	onBodyChange: (body: Json) => void;
	onError?: (message: string) => void;
};

const BlogImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			path: {
				default: null
			}
		};
	}
});

function ToolbarButton({
	active,
	disabled,
	label,
	onClick,
	children
}: {
	active?: boolean;
	disabled?: boolean;
	label: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				'inline-flex size-8 items-center justify-center rounded border text-[#444] transition-colors',
				'border-transparent hover:border-[#b8a99a]/50 hover:bg-[#f7f2ec]',
				'disabled:cursor-not-allowed disabled:opacity-40',
				active && 'border-[#b8a99a]/60 bg-[#efe6d8] text-[#333]'
			)}
		>
			{children}
		</button>
	);
}

export default function BodyStep({
	postId,
	body,
	onBodyChange,
	onError
}: BodyStepProps) {
	const [imageUploading, setImageUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const skipNextUpdateRef = useRef(false);

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: { levels: [2, 3] },
				link: false,
				blockquote: false,
				code: false,
				codeBlock: false,
				horizontalRule: false,
				strike: false,
				underline: false
			}),
			Link.configure({
				openOnClick: false,
				autolink: true,
				defaultProtocol: 'https',
				protocols: ['http', 'https', 'mailto'],
				HTMLAttributes: {
					class: 'text-[#805b32] underline underline-offset-2'
				}
			}),
			BlogImage.configure({
				inline: false,
				allowBase64: false,
				HTMLAttributes: {
					class: 'my-6 h-auto w-full object-cover'
				}
			})
		],
		content: body as object,
		editorProps: {
			attributes: {
				class: cn(
					'blog-tiptap-editor min-h-80 max-w-none px-4 py-5 outline-none',
					'font-sans text-base leading-relaxed text-[#555555]',
					'[&_h2]:mb-4 [&_h2]:font-heading [&_h2]:text-3xl [&_h2]:font-normal [&_h2]:text-[#333333]',
					'[&_h3]:mb-4 [&_h3]:font-heading [&_h3]:text-2xl [&_h3]:font-normal [&_h3]:text-[#333333]',
					'[&_p]:mb-4 [&_p]:last:mb-0',
					'[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6',
					'[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6',
					'[&_a]:text-[#805b32] [&_a]:underline [&_a]:underline-offset-2',
					'[&_img]:my-6 [&_img]:h-auto [&_img]:w-full [&_img]:object-cover'
				)
			}
		},
		onUpdate: ({ editor: current }) => {
			if (skipNextUpdateRef.current) {
				skipNextUpdateRef.current = false;
				return;
			}
			// Plain-object clone: null-prototype TipTap attrs break server actions.
			onBodyChange(toPlainBlogBody(current.getJSON() as Json));
		}
	});

	// Sync external body resets (e.g. after load) without looping updates.
	useEffect(() => {
		if (!editor) return;
		const current = JSON.stringify(editor.getJSON());
		const next = JSON.stringify(body);
		if (current === next) return;
		skipNextUpdateRef.current = true;
		editor.commands.setContent(body as object, { emitUpdate: false });
	}, [body, editor]);

	const setLink = useCallback(() => {
		if (!editor) return;
		const previous = editor.getAttributes('link').href as string | undefined;
		const url = window.prompt('Link URL (https:// or mailto:)', previous ?? 'https://');
		if (url === null) return;
		const trimmed = url.trim();
		if (!trimmed) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		const lower = trimmed.toLowerCase();
		if (
			!lower.startsWith('https://') &&
			!lower.startsWith('http://') &&
			!lower.startsWith('mailto:')
		) {
			onError?.('Links must start with https://, http://, or mailto:');
			return;
		}
		editor
			.chain()
			.focus()
			.extendMarkRange('link')
			.setLink({ href: trimmed })
			.run();
	}, [editor, onError]);

	async function handleImageFile(file: File | null) {
		if (!file || !editor) return;
		setImageUploading(true);
		try {
			const compressed = await compressBlogImage(file);
			if (isBlogImageTooLarge(compressed)) {
				onError?.(BLOG_IMAGE_TOO_LARGE_MESSAGE);
				return;
			}
			const formData = new FormData();
			formData.set('postId', postId);
			formData.set('kind', 'body');
			formData.set('file', compressed);
			const uploaded = await uploadBlogImage(formData);
			if (!uploaded.ok) {
				onError?.(friendlyBlogImageUploadError(uploaded.error));
				return;
			}
			editor
				.chain()
				.focus()
				.insertContent({
					type: 'image',
					attrs: {
						src: uploaded.publicUrl,
						alt: compressed.name,
						path: uploaded.path
					}
				})
				.run();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			onError?.(friendlyBlogImageUploadError(message));
		} finally {
			setImageUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	}

	if (!editor) {
		return (
			<section className="space-y-4">
				<div className="h-10 animate-pulse rounded border border-[#b8a99a]/40 bg-[#efe6d8]" />
				<div className="min-h-80 animate-pulse rounded border border-[#b8a99a]/40 bg-white" />
			</section>
		);
	}

	return (
		<section className="space-y-4">
			<div>
				<h3 className="text-sm font-medium text-[#444]">Article body</h3>
				<p className="mt-1 text-xs text-[#888]">
					Write the article content. Formatting is limited to headings, emphasis,
					lists, links, and images — matching the public page.
				</p>
			</div>

			<div
				role="toolbar"
				aria-label="Formatting"
				className="flex flex-wrap items-center gap-1 rounded border border-[#b8a99a]/40 bg-[#faf7f2] px-2 py-1.5"
			>
				<ToolbarButton
					label="Paragraph"
					active={editor.isActive('paragraph')}
					onClick={() => editor.chain().focus().setParagraph().run()}
				>
					<Pilcrow className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Heading 2"
					active={editor.isActive('heading', { level: 2 })}
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 2 }).run()
					}
				>
					<Heading2 className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Heading 3"
					active={editor.isActive('heading', { level: 3 })}
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 3 }).run()
					}
				>
					<Heading3 className="size-4" />
				</ToolbarButton>
				<span
					className="mx-1 h-5 w-px bg-[#b8a99a]/50"
					aria-hidden
				/>
				<ToolbarButton
					label="Bold"
					active={editor.isActive('bold')}
					onClick={() => editor.chain().focus().toggleBold().run()}
				>
					<Bold className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Italic"
					active={editor.isActive('italic')}
					onClick={() => editor.chain().focus().toggleItalic().run()}
				>
					<Italic className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Link"
					active={editor.isActive('link')}
					onClick={setLink}
				>
					<Link2 className="size-4" />
				</ToolbarButton>
				<span
					className="mx-1 h-5 w-px bg-[#b8a99a]/50"
					aria-hidden
				/>
				<ToolbarButton
					label="Bullet list"
					active={editor.isActive('bulletList')}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
				>
					<List className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Ordered list"
					active={editor.isActive('orderedList')}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
				>
					<ListOrdered className="size-4" />
				</ToolbarButton>
				<span
					className="mx-1 h-5 w-px bg-[#b8a99a]/50"
					aria-hidden
				/>
				<ToolbarButton
					label="Insert image"
					disabled={imageUploading}
					onClick={() => fileInputRef.current?.click()}
				>
					<ImageIcon className="size-4" />
				</ToolbarButton>
				{imageUploading ? (
					<span className="ml-2 text-xs text-[#888]">Uploading…</span>
				) : null}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif"
				className="sr-only"
				onChange={event => {
					const file = event.target.files?.[0] ?? null;
					void handleImageFile(file);
				}}
			/>

			<div className="overflow-hidden rounded border border-[#b8a99a]/40 bg-white">
				<EditorContent editor={editor} />
			</div>
		</section>
	);
}
