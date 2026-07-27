import { defineConfig } from 'tinacms';

export default defineConfig({
	branch: '',
	clientId: '',
	token: '',
	build: {
		publicFolder: 'public',
		outputFolder: 'admin'
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
						// set routing from tina filestructure to setting what page to show in tina i frame
						// Map this Tina document to the frontend route shown in the admin preview iframe
						// if (props.document._sys.relativePath === 'home.md') {
						// 	return '/home';
						// }
						// return props.document._sys.filename //clicking on home.md moves you to /home
						return '/';
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
							}
						]
					}
				]
			}
		]
	}
});
