'use client';

import StarDivider from '@/components/ui/star-divider';
import { BlogBlocksDivider } from '@/tina/__generated__/types';

export default function BlogDivider(props: BlogBlocksDivider) {
	return (
		<section className="bg-white px-4 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-3xl">
				{props.style === 'line' ? (
					<hr className="my-10 border-[#b8a99a]" />
				) : (
					<StarDivider />
				)}
			</div>
		</section>
	);
}
