import {
	BASE_URL,
	fillField,
	launchBrowser,
	shot,
	shotWithClick
} from './docs-capture-lib.mjs';

const EMAIL = 'alexander.braatz.creates@gmail.com';
const OTP = process.env.INVITE_OTP || '';
const PASSWORD = process.env.INVITE_PASSWORD || 'DocsManual2026!';
const SHOWN_NAME = process.env.INVITE_NAME || 'Alexander Creates';

async function settle(page) {
	await page.waitForLoadState('domcontentloaded');
	await page.waitForTimeout(400);
}

async function reportOtpError(page) {
	const alert = page.locator('[role="alert"]');
	if (await alert.isVisible().catch(() => false)) {
		const text = (await alert.innerText()).trim();
		console.error('OTP_ERROR:', text);
		return text;
	}
	const body = await page.locator('body').innerText();
	const match = body.match(/That code is invalid or expired[^\n]*/);
	if (match) {
		console.error('OTP_ERROR:', match[0].trim());
		return match[0].trim();
	}
	return null;
}

async function waitEnabledContinue(page) {
	await page.waitForFunction(() => {
		const btn = [...document.querySelectorAll('button')].find(
			b => b.textContent?.trim() === 'Continue'
		);
		return btn && !btn.disabled && btn.getAttribute('aria-busy') !== 'true';
	});
}

async function main() {
	if (!OTP) {
		console.error('Set INVITE_OTP env var to the email one-time code');
		process.exit(2);
	}

	const { browser, page } = await launchBrowser();
	try {
		// Do NOT request a new OTP — go straight to verify with the provided code.
		await page.goto(
			`${BASE_URL}/accept-invite/verify?email=${encodeURIComponent(EMAIL)}`,
			{ waitUntil: 'domcontentloaded' }
		);
		await settle(page);

		// Token input formats with spaces via controlled component — type digits.
		const tokenInput = page.locator('#token');
		await tokenInput.click();
		await tokenInput.fill('');
		await tokenInput.pressSequentially(OTP, { delay: 30 });

		await shotWithClick(page, {
			file: 'us03-02-enter-code.png',
			locator: page.getByRole('button', { name: 'Continue' }),
			number: 2
		});

		await Promise.all([
			page
				.waitForURL(
					url =>
						String(url).includes('/accept-invite') &&
						!String(url).includes('/verify'),
					{ timeout: 45000 }
				)
				.catch(() => {}),
			page.getByRole('button', { name: 'Continue' }).click()
		]);
		await settle(page);

		const otpErr = await reportOtpError(page);
		if (otpErr || page.url().includes('/verify')) {
			console.error(
				'OTP verification failed. Staying on verify page:',
				page.url()
			);
			if (!otpErr) {
				console.error(
					'OTP_ERROR: (no alert text) page body excerpt:\n',
					(await page.locator('body').innerText()).slice(0, 600)
				);
			}
			process.exit(1);
		}

		// Password
		await page.getByRole('heading', { name: /Set your password/i }).waitFor();
		await fillField(page, 'Password', PASSWORD);
		await fillField(page, 'Confirm password', PASSWORD);
		await shotWithClick(page, {
			file: 'us03-03-password.png',
			locator: page.getByRole('button', { name: 'Continue' }),
			number: 3
		});
		await Promise.all([
			page.waitForURL(/step=privacy/, { timeout: 45000 }),
			page.getByRole('button', { name: 'Continue' }).click()
		]);
		await settle(page);

		// Privacy — click checkbox so React state updates
		await page.getByRole('heading', { name: /Privacy/i }).waitFor();
		const checkbox = page.locator('input[type="checkbox"]').first();
		if (!(await checkbox.isChecked())) {
			await checkbox.click({ force: true });
		}
		await waitEnabledContinue(page);
		await shotWithClick(page, {
			file: 'us03-04-privacy.png',
			locator: page.getByRole('button', { name: 'Continue' }),
			number: 4
		});
		await Promise.all([
			page.waitForURL(/step=name/, { timeout: 45000 }),
			page.getByRole('button', { name: 'Continue' }).click()
		]);
		await settle(page);

		// Name
		await page.getByRole('heading', { name: /shown name/i }).waitFor();
		await fillField(page, 'Shown name', SHOWN_NAME);
		await shotWithClick(page, {
			file: 'us03-05-name.png',
			locator: page.getByRole('button', { name: 'Continue' }),
			number: 5
		});
		await Promise.all([
			page.waitForURL(/step=colour/, { timeout: 45000 }),
			page.getByRole('button', { name: 'Continue' }).click()
		]);
		await settle(page);

		// Colour — must pick a swatch before Continue enables
		await page.getByRole('heading', { name: /colour|color/i }).waitFor();
		await page.getByRole('radio').first().click();
		await waitEnabledContinue(page);
		await shotWithClick(page, {
			file: 'us03-06-colour.png',
			locator: page.getByRole('button', { name: 'Continue' }),
			number: 6
		});
		await Promise.all([
			page.waitForURL(/step=favorites/, { timeout: 45000 }),
			page.getByRole('button', { name: 'Continue' }).click()
		]);
		await settle(page);

		// Favorites — skip
		await page.getByRole('heading', { name: /favorites/i }).waitFor();
		const skip = page.getByRole('button', { name: 'Skip for now' });
		await page
			.waitForFunction(() => {
				const btn = [...document.querySelectorAll('button')].find(b =>
					/Skip for now/i.test(b.textContent || '')
				);
				return btn && !btn.disabled && btn.getAttribute('aria-busy') !== 'true';
			})
			.catch(() => {});
		await shotWithClick(page, {
			file: 'us03-07-favorites.png',
			locator: skip,
			number: 7
		});
		await Promise.all([
			page.waitForURL('**/place**', { timeout: 60000 }),
			skip.click({ force: true })
		]);
		await settle(page);
		await shot(page, { file: 'us03-08-members-hub.png', fullPage: true });

		console.log('US-03 capture complete. Password used:', PASSWORD);
	} finally {
		await browser.close();
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
