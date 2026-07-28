import PageContent from '@/components/ui/page-content';
import client from '@/tina/__generated__/client';

export default async function ShopMarketPage() {
	const result = await client.queries.page({ relativePath: 'shop-market.md' });
	return <PageContent {...result} />;
}
