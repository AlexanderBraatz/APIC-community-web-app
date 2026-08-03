import AuthConfirmClient from './auth-confirm-client';

type PageProps = {
	searchParams: Promise<{
		code?: string;
		token_hash?: string;
		type?: string;
		next?: string;
	}>;
};

export default async function AuthConfirmPage({ searchParams }: PageProps) {
	const params = await searchParams;

	return (
		<AuthConfirmClient
			code={params.code ?? null}
			tokenHash={params.token_hash ?? null}
			type={params.type ?? null}
			next={params.next ?? null}
		/>
	);
}
