import { PageQuery } from '@/tina/__generated__/types';
import React from 'react';

export default function PageContent(props: {
	data: PageQuery;
	variables: { relativePath: string };
	query: string;
}) {
	return <div>{props.data.page.title}</div>;
}
