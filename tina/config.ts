import { defineConfig } from 'tinacms';
import { BlogIdField } from './blog-id-field';
import { BlogImageField } from './blog-image-field';
import { BlogMapPostIdField } from './blog-map-post-id-field';
import { isNumericPostId, resolveBlogPostId } from './blog-post-id';

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
	branch: '',
	clientId: '',
	token: '',
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
									{ name: 'buttonLabel', label: 'Button Label', type: 'string' },
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
									{ name: 'sectionTitle', label: 'Section Title', type: 'string' },
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
											{ name: 'image', type: 'image' },
											{ name: 'link', type: 'string' }
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
									{ name: 'buttonLabel', label: 'Button Label', type: 'string' },
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
								name: 'eventListing',
								label: 'Event Listing',
								fields: [
									{ name: 'sectionTitle', label: 'Section Title', type: 'string' },
									{
										name: 'events',
										label: 'Events',
										type: 'object',
										list: true,
										ui: {
											itemProps: item => ({ label: item.name || 'New Event' })
										},
										fields: [
											{ name: 'name', type: 'string' },
											{ name: 'date', type: 'string' },
											{ name: 'address', type: 'string' },
											{ name: 'contact', type: 'string' },
											{
												name: 'notes',
												type: 'string',
												ui: { component: 'textarea' }
											}
										]
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
								name: 'imageGallery',
								label: 'Image Gallery',
								fields: [
									{
										name: 'images',
										label: 'Images',
										type: 'object',
										list: true,
										fields: [{ name: 'image', type: 'image' }]
									}
								]
							},
							{
								name: 'locationsMap',
								label: 'Listings map & search',
								fields: [
									{
										name: 'caption',
										label: 'Caption',
										type: 'string',
										description:
											'Optional. Google Map with listing pins requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and lat/lng on listings.'
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
						return values;
					}
				},
				fields: [
					{
						name: 'postId',
						label: 'Post ID',
						type: 'string',
						required: true,
						ui: {
							component: BlogIdField,
							description:
								'Auto-assigned exclusive ID used for the URL and media folder.',
							validate: (value: unknown) => {
								if (!isNumericPostId(value)) {
									return 'Post ID must be assigned before saving';
								}
							}
						}
					} as any,
					{ name: 'title', label: 'Title', type: 'string', isTitle: true, required: true },
					{ name: 'author', label: 'Author', type: 'string', required: true },
					{
						name: 'publishedAt',
						label: 'Publishing date',
						type: 'datetime',
						ui: { dateFormat: 'YYYY-MM-DD' }
					},
					{
						name: 'shortDescription',
						label: 'Short description',
						type: 'string',
						required: true,
						ui: { component: 'textarea' }
					},
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
										heading: '',
										body: ''
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
									previewSrc: '/images/blocks/image.svg'
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
									previewSrc: '/images/blocks/image-gallery.svg'
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
									previewSrc: '/images/blocks/pull-quote.svg'
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
									previewSrc: '/images/blocks/embed.svg'
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
									previewSrc: '/images/blocks/divider.svg'
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
									previewSrc: '/images/blocks/cta.svg'
								},
								fields: [
									{ name: 'title', label: 'Title', type: 'string' },
									{
										name: 'description',
										label: 'Description',
										type: 'string',
										ui: { component: 'textarea' }
									},
									{ name: 'buttonLabel', label: 'Button Label', type: 'string' },
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
