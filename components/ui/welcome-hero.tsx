import { PageBlocksWelcomeHero } from '@/tina/__generated__/types';
import { Components, TinaMarkdown } from 'tinacms/dist/rich-text';

export default function WelcomeHero(props: PageBlocksWelcomeHero) {
	return (
		<section>
			<div className="px-4 py-8 text-center">
				<TinaMarkdown
					content={props.message}
					components={
						{
							h1: props => (
								<h1
									className="mx-auto text-5xl font-extrabold leading-tight tracking-tighter text-primary md:text:text-7xl"
									{...props}
								/>
							),
							bold: props => (
								<span
									className="bg-gradient-to-b from-blue-300 to-pink-600 bg-clip-text text-transparent"
									{...props}
								/>
							),
							p: props => (
								<p
									className="mx-auto mt-8 mx-w-[700px] px-2 text-center text-xl text-muted-foreground"
									{...props}
								/>
							)
						} satisfies Components<object>
					}
				/>
			</div>
		</section>
	);
}
