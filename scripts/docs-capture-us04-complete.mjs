import {
	BASE_URL,
	fillField,
	launchBrowser,
	shot,
	shotWithClick
} from './docs-capture-lib.mjs';

const EMAIL = process.env.RECOVERY_EMAIL || 'alexander.braatz.creates@gmail.com';
const OTP = process.env.RECOVERY_OTP || '';
const PASSWORD = process.env.RECOVERY_PASSWORD || 'DocsManual2026!';

async function settle(page) {
	await page.waitForLoadState('domcontentloaded');
	await page.waitForTimeout(400);
}

async function main() {
	if (!OTP) {
		console.error('Set RECOVERY_OTP');
		process.exit(2);
	}

	const { browser, page } = await launchBrowser();
	try {
		// Do NOT request a new code — go straight to verify.
		await page.goto(
			`${BASE_URL}/forgot-password/verify?email=${encodeURIComponent(EMAIL)}`,
			{ waitUntil: 'domcontentloaded' }
		);
		await settle(page);

		const tokenInput = page.locator('#token');
		await tokenInput.click();
		await tokenInput.fill('');
		await tokenInput.pressSequentially(OTP, { delay: 30 });

		await shotWithClick(page, {
			file: 'us04-02-enter-code.png',
			locator: page.getByRole('button', { name: 'Continue' }),
			number: 2
		});

		await Promise.all([
			page.waitForURL('**/reset-password**', { timeout: 45000 }).catch(() => {}),
			page.getByRole('button', { name: 'Continue' }).click()
		]);
		await settle(page);

		const alertText = (
			await page.locator('[role="alert"]').innerText().catch(() => '')
		).trim();
		const body = await page.locator('body').innerText();
		if (
			!page.url().includes('/reset-password') ||
			/invalid or expired/i.test(body)
		) {
			console.error(
				'RECOVERY_OTP_ERROR:',
				alertText ||
					body.match(/That code is invalid or expired[^\n]*/)?.[0] ||
					'(unknown)'
			);
			console.error('URL:', page.url());
			process.exit(1);
		}

		await fillField(page, 'New password', PASSWORD);
		await fillField(page, 'Confirm password', PASSWORD);
		await shotWithClick(page, {
			file: 'us04-03-new-password.png',
			locator: page.getByRole('button', { name: /Save password/i }),
			number: 3
		});

		await Promise.all([
			page
				.waitForURL(
					url =>
						String(url).includes('/place') ||
						String(url).includes('/sign-in') ||
						!String(url).includes('/reset-password'),
					{ timeout: 45000 }
				)
				.catch(() => {}),
			page.getByRole('button', { name: /Save password/i }).click()
		]);
		await settle(page);

		const doneAlert = (
			await page.locator('[role="alert"]').innerText().catch(() => '')
		).trim();
		if (doneAlert && page.url().includes('/reset-password')) {
			console.error('RESET_ERROR:', doneAlert);
			process.exit(1);
		}

		await shot(page, { file: 'us04-04-done.png', fullPage: true });
		console.log('US-04 capture complete. URL:', page.url());
	} finally {
		await browser.close();
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
