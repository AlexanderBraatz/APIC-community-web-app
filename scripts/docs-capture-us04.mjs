import {
	BASE_URL,
	launchBrowser,
	shotWithClick
} from './docs-capture-lib.mjs';

const EMAIL = process.env.RECOVERY_EMAIL || 'alexander.braatz.creates@gmail.com';

async function main() {
	const { browser, page } = await launchBrowser();
	try {
		await page.goto(`${BASE_URL}/forgot-password`, {
			waitUntil: 'domcontentloaded'
		});
		await page.locator('#email').fill(EMAIL);

		await shotWithClick(page, {
			file: 'us04-01-request.png',
			locator: page.getByRole('button', { name: /Request a code/i }),
			number: 1
		});

		await Promise.all([
			page.waitForURL('**/forgot-password/verify**', { timeout: 45000 }),
			page.getByRole('button', { name: /Request a code/i }).click()
		]);
		await page.waitForLoadState('domcontentloaded');

		await shotWithClick(page, {
			file: 'us04-02-enter-code.png',
			locator: page.getByRole('button', { name: /^Continue$/i }),
			number: 2
		});

		console.log('NEED_RECOVERY_OTP');
		console.log('Email:', EMAIL);
		console.log('URL:', page.url());
		console.log(
			'Recovery code requested. Enter OTP from email to continue US-04.'
		);
	} finally {
		await browser.close();
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
