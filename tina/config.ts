import { defineConfig } from 'tinacms';
import { FeaturedIcons } from '../components/icons';
import { IconSelector } from './icon-selector';

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
								name: 'welcomeHero',
								label: 'Welcome Hero',
								fields: [
									{
										name: 'message',
										type: 'rich-text'
									},
									{
										name: 'links',
										label: 'Links',
										type: 'object',
										list: true,
										fields: [
											{
												name: 'link',
												type: 'string'
											},
											{
												name: 'label',
												type: 'string'
											},
											{
												name: 'style',
												type: 'string',
												options: ['simple', 'button']
											}
										]
									}
								]
							},
							{
								name: 'featureList',
								label: 'Features List',
								fields: [
									{
										name: 'message',
										type: 'rich-text'
									},
									{
										name: 'byline',
										type: 'string'
									},
									{
										name: 'features',
										label: 'Features',
										type: 'object',
										list: true,
										ui: {
											itemProps: item => {
												return { label: item.label };
											},
											defaultItem: {
												icon: Object.keys(FeaturedIcons)[0],
												label: 'New Feature',
												description:
													'Hello i am a new feature nice to meet you. i hope you have a great day.'
											}
										},
										fields: [
											{
												name: 'icon',
												type: 'string',
												options: Object.keys(FeaturedIcons),
												ui: {
													component: IconSelector
												}
											},
											{
												name: 'label',
												type: 'string'
											},
											{
												name: 'description',
												type: 'string',
												ui: { component: 'textarea' }
											},
											{
												name: 'style',
												type: 'string',
												options: ['simple', 'button']
											}
										]
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
