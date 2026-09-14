'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
	error
}: {
	error: Error & { digest?: string };
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					minHeight: '100vh',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontFamily:
						'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
					background: '#fff',
					color: '#444'
				}}
			>
				<main style={{ maxWidth: 28 * 16, padding: 24, textAlign: 'center' }}>
					<h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
						Something went wrong
					</h1>
					<p style={{ marginTop: 12, lineHeight: 1.5 }}>
						An unexpected error occurred. Please refresh the page or try again
						shortly.
					</p>
					{error.digest ? (
						<p
							style={{
								marginTop: 16,
								fontSize: '0.75rem',
								color: '#888'
							}}
						>
							Reference: {error.digest}
						</p>
					) : null}
				</main>
			</body>
		</html>
	);
}
