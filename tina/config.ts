import { defineConfig } from 'tinacms';

const COMMUNITY_FEATURE_ICONS = ['Users', 'Mic', 'Heart', 'FileText'];

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
							}
						]
					}
				]
			}
		]
	}
});
