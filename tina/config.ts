import { defineConfig } from 'tinacms';
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

const PAGE_STARTER_IMAGE = '/images/Il-Borgo-Garden-View-scaled.jpg';
const PAGE_STARTER_HEADING = 'Click to replace this heading';
const PAGE_STARTER_SUBTITLE = 'Click to replace this subtitle';
const PAGE_STARTER_DESCRIPTION =
	'Click to replace this description with your own text.';
const PAGE_STARTER_BUTTON_LABEL = 'Click to replace';
const PAGE_STARTER_BUTTON_LINK = 'mailto:info.apic@aol.com';
const PAGE_STARTER_CAPTION = 'Click to replace this caption';
const PAGE_STARTER_VIDEO = '/videos/apicherovideo.mp4';
const PAGE_STARTER_TEXT_BODY = richTextBody(
	'Click here to replace this text with your page content.',
	'You can add more paragraphs, headings, and links. Everything in this block is placeholder content meant to be replaced.'
);
const PAGE_STARTER_FEATURE_IMAGES = [
	'/images/apic-connect.webp',
	'/images/apic-shared.webp',
	'/images/apic-offer-2.png',
	'/images/apic-member.webp'
] as const;
const PAGE_STARTER_CATEGORY_IMAGES = [
	'/images/apic-event.webp',
	'/images/apic-food-hero.webp',
	'/images/Il-Borgo-Garden-View-scaled.jpg'
] as const;

const COMMUNITY_FEATURE_ICONS = ['Users', 'Mic', 'Heart', 'FileText'];

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
						ui: {
							visualSelector: true
						},
						templates: [
							{
								name: 'heroBanner',
								label: 'Hero Banner',
								ui: {
									previewSrc: '/images/blocks/hero-banner.svg',
									defaultItem: {
										heading: PAGE_STARTER_HEADING,
										subtitle: PAGE_STARTER_SUBTITLE,
										backgroundVideo: PAGE_STARTER_VIDEO,
										backgroundImage: '/images/apicherovideo.jpg'
									}
								},
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
								ui: {
									previewSrc: '/images/blocks/community-features.svg',
									defaultItem: {
										title: PAGE_STARTER_HEADING,
										features: [
											{
												icon: 'Users',
												label: 'Click to replace this feature',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_FEATURE_IMAGES[0]
											},
											{
												icon: 'Mic',
												label: 'Click to replace this feature',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_FEATURE_IMAGES[1]
											},
											{
												icon: 'Heart',
												label: 'Click to replace this feature',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_FEATURE_IMAGES[2]
											},
											{
												icon: 'FileText',
												label: 'Click to replace this feature',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_FEATURE_IMAGES[3]
											}
										]
									}
								},
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
												label: 'Click to replace this feature',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_IMAGE
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
								ui: {
									previewSrc: '/images/blocks/quote-banner.svg',
									defaultItem: {
										intro: 'Click to replace this intro line',
										heading: PAGE_STARTER_HEADING,
										buttonLabel: PAGE_STARTER_BUTTON_LABEL,
										buttonLink: PAGE_STARTER_BUTTON_LINK,
										backgroundImage: '/images/apic-footer-hero.webp'
									}
								},
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
								ui: {
									previewSrc: '/images/blocks/button-list.svg',
									defaultItem: {
										sectionTitle: PAGE_STARTER_HEADING,
										description: PAGE_STARTER_DESCRIPTION,
										buttons: [
											{
												label: PAGE_STARTER_BUTTON_LABEL,
												link: PAGE_STARTER_BUTTON_LINK
											},
											{
												label: 'Click to replace',
												link: '/about'
											}
										]
									}
								},
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
											itemProps: item => ({ label: item.label || 'Button' }),
											defaultItem: {
												label: PAGE_STARTER_BUTTON_LABEL,
												link: PAGE_STARTER_BUTTON_LINK
											}
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
								ui: {
									previewSrc: '/images/blocks/category-grid.svg',
									defaultItem: {
										sectionTitle: PAGE_STARTER_HEADING,
										items: [
											{
												title: 'Click to replace this category',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_CATEGORY_IMAGES[0],
												link: '/about',
												buttonLabel: PAGE_STARTER_BUTTON_LABEL
											},
											{
												title: 'Click to replace this category',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_CATEGORY_IMAGES[1],
												link: '/about',
												buttonLabel: PAGE_STARTER_BUTTON_LABEL
											},
											{
												title: 'Click to replace this category',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_CATEGORY_IMAGES[2],
												link: '/about',
												buttonLabel: PAGE_STARTER_BUTTON_LABEL
											}
										]
									}
								},
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
											itemProps: item => ({ label: item.title }),
											defaultItem: {
												title: 'Click to replace this category',
												description: PAGE_STARTER_DESCRIPTION,
												image: PAGE_STARTER_IMAGE,
												link: '/about',
												buttonLabel: PAGE_STARTER_BUTTON_LABEL
											}
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
								ui: {
									previewSrc: '/images/blocks/cta-section.svg',
									defaultItem: {
										title: PAGE_STARTER_HEADING,
										description: PAGE_STARTER_DESCRIPTION,
										buttonLabel: PAGE_STARTER_BUTTON_LABEL,
										buttonLink: PAGE_STARTER_BUTTON_LINK
									}
								},
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
								ui: {
									previewSrc: '/images/blocks/section-heading.svg',
									defaultItem: {
										sectionTitle: PAGE_STARTER_HEADING
									}
								},
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
								ui: {
									previewSrc: '/images/blocks/text-section.svg',
									defaultItem: {
										sectionTitle: PAGE_STARTER_HEADING,
										body: PAGE_STARTER_TEXT_BODY
									}
								},
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
								ui: {
									previewSrc: '/images/blocks/image-caption-list.svg',
									defaultItem: {
										items: [
											{
												image: PAGE_STARTER_CATEGORY_IMAGES[0],
												caption: PAGE_STARTER_CAPTION
											},
											{
												image: PAGE_STARTER_CATEGORY_IMAGES[1],
												caption: PAGE_STARTER_CAPTION
											},
											{
												image: PAGE_STARTER_CATEGORY_IMAGES[2],
												caption: PAGE_STARTER_CAPTION
											}
										]
									}
								},
								fields: [
									{
										name: 'items',
										label: 'Items',
										type: 'object',
										list: true,
										ui: {
											itemProps: item => ({
												label: item.caption || 'Item'
											}),
											defaultItem: {
												image: PAGE_STARTER_IMAGE,
												caption: PAGE_STARTER_CAPTION
											}
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
								ui: {
									previewSrc: '/images/blocks/locations-map.svg',
									defaultItem: {
										heading: PAGE_STARTER_HEADING,
										subtitle: 'local places',
										caption: PAGE_STARTER_CAPTION
									}
								},
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
		]
	}
});
