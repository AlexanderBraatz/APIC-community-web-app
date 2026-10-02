import {
	BASE_URL,
	launchBrowser,
	shotWithClick
} from './docs-capture-lib.mjs';

async function main() {
	const { browser, page } = await launchBrowser();
	try {
		await page.goto(
			`${BASE_URL}/accept-invite?email=alexander.braatz.creates%40gmail.com`,
			{ waitUntil: 'domcontentloaded' }
		);

		await shotWithClick(page, {
			file: 'us03-01-request-code.png',
			locator: page.getByRole('button', { name: /Request a code/i }),
			number: 1
		});

		await Promise.all([
			page.waitForURL('**/accept-invite/verify**', { timeout: 45000 }),
			page.getByRole('button', { name: /Request a code/i }).click()
		]);
		await page.waitForLoadState('domcontentloaded');

		await shotWithClick(page, {
			file: 'us03-02-enter-code-empty.png',
			locator: page.getByRole('button', { name: /^Continue$/i }),
			number: 2
		});

		console.log('US-03 request/verify capture success');
		console.log('URL:', page.url());
	} finally {
		await browser.close();
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
