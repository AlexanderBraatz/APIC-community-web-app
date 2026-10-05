import { defineConfig } from 'tinacms';
import { BlogIdField } from './blog-id-field';
import { BlogImageField } from './blog-image-field';
import { BlogMapPostIdField } from './blog-map-post-id-field';
import {
	BlogAuthorField,
	BlogCollapsedMetaPanel,
	BlogPublishedAtField,
	BlogShortDescriptionField,
	BlogTitleField
} from './blog-meta-panel';
import { isNumericPostId, resolveBlogPostId } from './blog-post-id';

const BLOG_STARTER_IMAGE = '/images/Il-Borgo-Garden-View-scaled.jpg';
const BLOG_STARTER_HEADING = 'Click to replace this heading';
const BLOG_STARTER_CAPTION = 'Click to replace this caption';
const BLOG_STARTER_ALT = 'Click the image to replace it';
const BLOG_STARTER_GALLERY_IMAGES = [
	{
		image: '/images/Il-Borgo-Garden-View-scaled.jpg',
		alt: 'Click to replace gallery image 1'
	},
	{
		image: '/images/apic-event.webp',
		alt: 'Click to replace gallery image 2'
	},
	{
		image: '/images/apic-food-hero.webp',
		alt: 'Click to replace gallery image 3'
	},
	{
		image: '/images/toskana-maremma-casale-marittimo-dt_m_136206543.jpg',
		alt: 'Click to replace gallery image 4'
	}
] as const;
const BLOG_STARTER_VIDEO_URL = 'https://www.youtube.com/watch?v=AKeUssuu3Is';

/** Tina rich-text defaultItem must be Plate AST, not a plain string. */
function richTextBody(...paragraphs: string[]) {
	return {
		type: 'root' as const,
		children: paragraphs.map(text => ({
			type: 'p' as const,
			children: [{ type: 'text' as const, text }]
		}))
	};
}

const BLOG_STARTER_BODY = richTextBody(
	'Click here to replace this text with your article.'
);
const BLOG_STARTER_INTRO_BODY = richTextBody(
	'Click here to replace this introduction. Use this Rich Text block for the main story of your article.',
	'You can add more paragraphs, headings, and links. Everything in this example post is placeholder content meant to be replaced.'
);
const BLOG_STARTER_FOLLOW_UP_BODY = richTextBody(
	'Click here to continue your article after the gallery. Add details, quotes from members, or next steps for readers.'
);

const COMMUNITY_FEATURE_ICONS = ['Users', 'Mic', 'Heart', 'FileText'];

/** Media path under mediaRoot (`images`), e.g. blog/3 */
function blogMediaUploadDir(formValues: Record<string, unknown>) {
	const postId = resolveBlogPostId(formValues);
	if (!postId) {
		throw new Error('Wait for Post ID before uploading images');
	}
	return `blog/${postId}`;
}

const blogImageField = {
	name: 'image' as const,
	label: 'Image',
	type: 'image' as const,
	uploadDir: blogMediaUploadDir,
	ui: {
		component: BlogImageField as never
	}
};

export default defineConfig({
	branch: 'main',
	clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
	token: process.env.TINA_TOKEN,
	build: {
		publicFolder: 'public',
		outputFolder: 'admin'
	},
	media: {
		tina: {
			publicFolder: 'public',
			mediaRoot: 'images'
		}
	},
	schema: {
		collections: [
			{
				name: 'page',
				label: 'Page',
				path: 'content/pages',
				format: 'md',
				ui: {
					router: props => {
						if (props.document._sys.filename === 'home') {
							return '/';
						}
						return `/${props.document._sys.filename}`;
					}
				},
				fields: [
					{ name: 'title', type: 'string' },
					{
						name: 'blocks',
						label: 'Blocks',
						type: 'object',
						list: true,
						templates: [
							{
								name: 'heroBanner',
								label: 'Hero Banner',
								fields: [
									{ name: 'heading', type: 'string', required: true },
									{ name: 'subtitle', type: 'string' },
									{
										name: 'backgroundVideo',
										label: 'Background Video',
										type: 'string',
										description:
											'Path to video in public folder, e.g. /videos/apicherovideo.mp4'
									},
									{
										name: 'backgroundImage',
										label: 'Background Image / Poster',
										type: 'image'
									}
								]
							},
							{
								name: 'communityFeatures',
								label: 'Community Features',
								fields: [
									{ name: 'title', type: 'string', required: true },
									{
										name: 'features',
										label: 'Features',
										type: 'object',
										list: true,
										ui: {
											itemProps: item => ({ label: item.label }),
											defaultItem: {
												icon: 'Users',
												label: 'New Feature',
												description:
													'Describe this community feature for members.'
											}
										},
										fields: [
											{
												name: 'icon',
												type: 'string',
												options: COMMUNITY_FEATURE_ICONS
											},
											{ name: 'label', type: 'string' },
											{
												name: 'description',
												type: 'string',
												ui: { component: 'textarea' }
											},
											{ name: 'image', type: 'image' }
										]
									}
								]
							},
							{
								name: 'quoteBanner',
								label: 'Quote Banner',
								fields: [
									{ name: 'intro', type: 'string' },
									{ name: 'heading', type: 'string', required: true },
									{
										name: 'buttonLabel',
										label: 'Button Label',
										type: 'string'
									},
									{ name: 'buttonLink', label: 'Button Link', type: 'string' },
									{
										name: 'backgroundImage',
										label: 'Background Image',
										type: 'image'
									}
								]
							},
							{
								name: 'buttonList',
								label: 'Button List',
								fields: [
									{ name: 'sectionTitle', label: 'Heading', type: 'string' },
									{
										name: 'description',
										label: 'Description',
										type: 'string',
										ui: { component: 'textarea' }
									},
									{
										name: 'buttons',
										label: 'Buttons',
										type: 'object',
										list: true,
										ui: {
											itemProps: item => ({ label: item.label || 'Button' })
										},
										fields: [
											{ name: 'label', type: 'string' },
											{ name: 'link', type: 'string' }
										]
									}
								]
							},
							{
								name: 'categoryGrid',
								label: 'Category Grid',
								fields: [
									{
										name: 'sectionTitle',
										label: 'Section Title',
										type: 'string'
									},
									{
										name: 'items',
										label: 'Categories',
										type: 'object',
										list: true,
										ui: {
											itemProps: item => ({ label: item.title })
										},
										fields: [
											{ name: 'title', type: 'string' },
											{
												name: 'description',
												type: 'string',
												ui: { component: 'textarea' }
											},
											{ name: 'image', type: 'image' },
											{ name: 'link', type: 'string' },
											{
												name: 'buttonLabel',
												label: 'Button Label',
												type: 'string'
											}
										]
									}
								]
							},
							{
								name: 'ctaSection',
								label: 'CTA Section',
								fields: [
									{ name: 'title', type: 'string', required: true },
									{
										name: 'description',
										type: 'string',
										ui: { component: 'textarea' }
									},
									{
										name: 'buttonLabel',
										label: 'Button Label',
										type: 'string'
									},
									{ name: 'buttonLink', label: 'Button Link', type: 'string' }
								]
							},
							{
								name: 'sectionHeading',
								label: 'Section Heading',
								fields: [
									{
										name: 'sectionTitle',
										label: 'Section Title',
										type: 'string'
									}
								]
							},
							{
								name: 'textSection',
								label: 'Text',
								fields: [
									{ name: 'sectionTitle', label: 'Heading', type: 'string' },
									{
										name: 'body',
										label: 'Body',
										type: 'rich-text'
									}
								]
							},
							{
								name: 'imageCaptionList',
								label: 'Image and Caption List',
								fields: [
									{
										name: 'items',
										label: 'Items',
										type: 'object',
										list: true,
										ui: {
											itemProps: item => ({
												label: item.caption || 'Item'
											})
										},
										fields: [
											{ name: 'image', type: 'image' },
											{ name: 'caption', type: 'string' }
										]
									}
								]
							},
							{
								name: 'locationsMap',
								label: 'Recommendations map & search',
								fields: [
									{
										name: 'heading',
										label: 'Heading',
										type: 'string',
										required: true
									},
									{
										name: 'subtitle',
										label: 'Subtitle',
										type: 'string',
										description:
											'Shown after “browse our recommendations for” on the right of the search row.'
									},
									{
										name: 'caption',
										label: 'Caption',
										type: 'string',
										description:
											'Optional. Google Map with recommendation pins requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and lat/lng on recommendations.'
									}
								]
							}
						]
					}
				]
			},
			{
				name: 'blogIndex',
				label: 'Blog Index',
				path: 'content/blog-index',
				format: 'json',
				ui: {
					allowedActions: {
						create: false,
						delete: false
					},
					router: () => '/blog'
				},
				fields: [
					{
						name: 'title',
						label: 'Title',
						type: 'string',
						required: true,
						isTitle: true,
						ui: {
							component: 'textarea',
							description:
								'Use a line break where the heading should wrap (for example after “Events, Activities &”).'
						}
					},
					{
						name: 'description',
						label: 'Description',
						type: 'string',
						ui: { component: 'textarea' }
					}
				]
			},
			{
				name: 'blog',
				label: 'Blog',
				path: 'content/blog',
				format: 'md',
				ui: {
					router: ({ document }) => `/blog/${document._sys.filename}`,
					filename: {
						readonly: true,
						slugify: values => {
							const postId = values?.postId;
							return isNumericPostId(postId) ? postId : '';
						},
						description:
							'Set automatically from the Post ID (for example <code>1</code>, <code>2</code>, <code>3</code>). Used for the post URL (<code>/blog/2</code>) and media folder (<code>images/blog/2/</code>). You do not need to edit this.'
					},
					beforeSubmit: async ({ values }) => {
						if (!isNumericPostId(values?.postId)) {
							throw new Error(
								'Post ID must be assigned before saving. Wait for it to appear, then save.'
							);
						}
						const title =
							typeof values?.title === 'string' ? values.title.trim() : '';
						const author =
							typeof values?.author === 'string' ? values.author.trim() : '';
						const shortDescription =
							typeof values?.shortDescription === 'string'
								? values.shortDescription.trim()
								: '';
						const publishedAt =
							typeof values?.publishedAt === 'string'
								? values.publishedAt.trim()
								: '';
						if (!title) {
							throw new Error('Title is required before saving.');
						}
						if (!author) {
							throw new Error('Author is required before saving.');
						}
						if (!publishedAt) {
							throw new Error('Publishing date is required before saving.');
						}
						if (!shortDescription) {
							throw new Error('Short description is required before saving.');
						}
						const { _metaPanel: _unused, ...rest } = values as Record<
							string,
							unknown
						> & { _metaPanel?: unknown };
						void _unused;
						return {
							...rest,
							title,
							author,
							publishedAt,
							shortDescription
						};
					},
					// Runtime supports ui.defaultItem on field collections; schema types lag behind.
					// Seed all required fields so GraphQL never sees null on a half-created post.
					...({
						defaultItem: () => ({
							// Replaced with "{postId} — New blog post" once Post ID is assigned.
							title: 'New blog post',
							author: 'APIC',
							publishedAt: new Date().toISOString(),
							shortDescription:
								'Click to replace this short description. It appears on the blog index card.',
							blocks: [
								{
									_template: 'image',
									image: BLOG_STARTER_IMAGE,
									alt: BLOG_STARTER_ALT,
									caption: BLOG_STARTER_CAPTION
								},
								{ _template: 'divider', style: 'star' },
								{
									_template: 'richText',
									heading: 'Click to replace this introduction heading',
									body: BLOG_STARTER_INTRO_BODY
								},
								{
									_template: 'pullQuote',
									quote:
										'Click to replace this pull quote.\nAdd a memorable line from your article here.',
									attribution: 'Click to replace attribution'
								},
								{ _template: 'divider', style: 'line' },
								{
									_template: 'imageGallery',
									images: BLOG_STARTER_GALLERY_IMAGES.map(item => ({
										...item
									}))
								},
								{
									_template: 'richText',
									heading: 'Click to replace this section heading',
									body: BLOG_STARTER_FOLLOW_UP_BODY
								},
								{
									_template: 'embed',
									url: BLOG_STARTER_VIDEO_URL,
									caption: 'Click to replace this video caption'
								},
								{ _template: 'divider', style: 'star' },
								{
									_template: 'cta',
									title: 'Click to replace this call to action',
									description:
										'Click to replace this CTA description. Invite readers to get in touch or take the next step.',
									buttonLabel: 'Click to replace button',
									buttonLink: 'mailto:info.apic@aol.com'
								},
								{
									_template: 'map',
									postId: ''
								}
							]
						})
					} as object)
				},
				fields: [
					{
						name: 'postId',
						label: false,
						type: 'string',
						required: true,
						ui: {
							component: BlogIdField,
							validate: (value: unknown) => {
								if (!isNumericPostId(value)) {
									return 'Post ID must be assigned before saving';
								}
							}
						}
					} as any,
					{
						name: '_metaPanel',
						label: false,
						type: 'string',
						ui: {
							component: BlogCollapsedMetaPanel
						}
					} as any,
					{
						name: 'title',
						label: 'Title',
						type: 'string',
						isTitle: true,
						required: true,
						ui: {
							component: BlogTitleField
						}
					} as any,
					{
						name: 'author',
						label: 'Author',
						type: 'string',
						required: true,
						ui: {
							component: BlogAuthorField
						}
					} as any,
					{
						name: 'publishedAt',
						label: 'Publishing date',
						type: 'datetime',
						required: true,
						ui: {
							dateFormat: 'YYYY-MM-DD',
							component: BlogPublishedAtField
						}
					} as any,
					{
						name: 'shortDescription',
						label: 'Short description',
						type: 'string',
						required: true,
						ui: {
							component: BlogShortDescriptionField
						}
					} as any,
					{
						name: 'blocks',
						label: 'Blocks',
						type: 'object',
						list: true,
						ui: {
							visualSelector: true
						},
						templates: [
							{
								name: 'richText',
								label: 'Rich Text',
								ui: {
									previewSrc: '/images/blocks/rich-text.svg',
									defaultItem: {
										heading: BLOG_STARTER_HEADING,
										body: BLOG_STARTER_BODY
									}
								},
								fields: [
									{ name: 'heading', label: 'Heading', type: 'string' },
									{ name: 'body', label: 'Body', type: 'rich-text' }
								]
							},
							{
								name: 'image',
								label: 'Image',
								ui: {
									previewSrc: '/images/blocks/image.svg',
									defaultItem: {
										image: BLOG_STARTER_IMAGE,
										alt: BLOG_STARTER_ALT,
										caption: BLOG_STARTER_CAPTION
									}
								},
								fields: [
									blogImageField,
									{ name: 'caption', label: 'Caption', type: 'string' },
									{
										name: 'alt',
										label: 'Alt text',
										type: 'string',
										description: 'Describe the image for accessibility'
									}
								]
							},
							{
								name: 'imageGallery',
								label: 'Image Gallery',
								ui: {
									previewSrc: '/images/blocks/image-gallery.svg',
									defaultItem: {
										images: BLOG_STARTER_GALLERY_IMAGES.map(item => ({
											...item
										}))
									}
								},
								fields: [
									{
										name: 'images',
										label: 'Images',
										type: 'object',
										list: true,
										fields: [
											blogImageField,
											{ name: 'alt', label: 'Alt text', type: 'string' }
										]
									}
								]
							},
							{
								name: 'pullQuote',
								label: 'Pull Quote',
								ui: {
									previewSrc: '/images/blocks/pull-quote.svg',
									defaultItem: {
										quote:
											'Click to replace this pull quote.\nAdd a memorable line from your article here.',
										attribution: 'Click to replace attribution'
									}
								},
								fields: [
									{
										name: 'quote',
										label: 'Quote',
										type: 'string',
										ui: { component: 'textarea' },
										required: true
									},
									{ name: 'attribution', label: 'Attribution', type: 'string' }
								]
							},
							{
								name: 'embed',
								label: 'Embed',
								ui: {
									previewSrc: '/images/blocks/embed.svg',
									defaultItem: {
										url: BLOG_STARTER_VIDEO_URL,
										caption: 'Click to replace this video caption'
									}
								},
								fields: [
									{
										name: 'url',
										label: 'URL',
										type: 'string',
										required: true,
										description: 'YouTube, Vimeo, or other embeddable URL'
									},
									{ name: 'caption', label: 'Caption', type: 'string' }
								]
							},
							{
								name: 'divider',
								label: 'Divider',
								ui: {
									previewSrc: '/images/blocks/divider.svg',
									defaultItem: {
										style: 'star'
									}
								},
								fields: [
									{
										name: 'style',
										label: 'Style',
										type: 'string',
										options: [
											{ label: 'Star', value: 'star' },
											{ label: 'Line', value: 'line' }
										]
									}
								]
							},
							{
								name: 'cta',
								label: 'Call to Action',
								ui: {
									previewSrc: '/images/blocks/cta.svg',
									defaultItem: {
										title: 'Click to replace this call to action',
										description:
											'Click to replace this CTA description. Invite readers to get in touch or take the next step.',
										buttonLabel: 'Click to replace button',
										buttonLink: 'mailto:info.apic@aol.com'
									}
								},
								fields: [
									{ name: 'title', label: 'Title', type: 'string' },
									{
										name: 'description',
										label: 'Description',
										type: 'string',
										ui: { component: 'textarea' }
									},
									{
										name: 'buttonLabel',
										label: 'Button Label',
										type: 'string'
									},
									{ name: 'buttonLink', label: 'Button Link', type: 'string' }
								]
							},
							{
								name: 'map',
								label: 'Map',
								ui: {
									previewSrc: '/images/blocks/map.svg',
									defaultItem: {
										postId: ''
									}
								},
								fields: [
									{
										name: 'postId',
										label: 'Post ID',
										type: 'string',
										ui: {
											component: BlogMapPostIdField
										}
									}
								]
							}
						]
					}
				]
			}
		]
	}
});
