import {
	BASE_URL,
	launchBrowser,
	shot,
	shotWithClick
} from './docs-capture-lib.mjs';

const EMAIL = process.env.SIGNIN_EMAIL || 'alexander.braatz.creates@gmail.com';
const PASSWORD = process.env.SIGNIN_PASSWORD || 'DocsManual2026!';

async function main() {
	const { browser, page } = await launchBrowser();
	try {
		await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
		await page.locator('#email').fill(EMAIL);
		await page.locator('#password').fill(PASSWORD);

		await shotWithClick(page, {
			file: 'us02-01-sign-in-form.png',
			locator: page.getByRole('button', { name: /Sign in/i }),
			number: 1
		});

		await Promise.all([
			page.waitForURL(url => !String(url).includes('/sign-in'), {
				timeout: 45000
			}),
			page.getByRole('button', { name: /Sign in/i }).click()
		]);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(600);

		const url = page.url();
		console.log('After sign-in URL:', url);

		const alertText = (
			await page.locator('[role="alert"]').innerText().catch(() => '')
		).trim();
		if (alertText) {
			console.error('SIGNIN_ERROR:', alertText);
			process.exit(1);
		}

		if (url.includes('/sign-in')) {
			console.error('SIGNIN_ERROR: still on sign-in');
			console.error((await page.locator('body').innerText()).slice(0, 800));
			process.exit(1);
		}

		await shot(page, { file: 'us02-02-members-hub.png', fullPage: true });
		console.log('US-02 capture complete. URL:', page.url());
	} finally {
		await browser.close();
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
