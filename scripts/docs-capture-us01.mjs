import {
	BASE_URL,
	launchBrowser,
	shot,
	shotWithClick
} from './docs-capture-lib.mjs';

/**
 * Current app: /about and /blog are auth-gated (redirect to /sign-in when signed out).
 * Public visitor path: home + category pages + contact / sign-in CTAs.
 */
async function main() {
	const { browser, page } = await launchBrowser();
	try {
		await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

		await shotWithClick(page, {
			file: 'us01-01-home-food.png',
			locator: page
				.getByRole('navigation')
				.getByRole('link', { name: 'Food & Dining' }),
			number: 1
		});

		await page
			.getByRole('navigation')
			.getByRole('link', { name: 'Food & Dining' })
			.click();
		await page.waitForURL('**/food-dining**');
		await page.waitForLoadState('networkidle');

		await shotWithClick(page, {
			file: 'us01-02-food-services.png',
			locator: page
				.getByRole('navigation')
				.getByRole('link', { name: 'Services & Maintenance' }),
			number: 2
		});

		await page
			.getByRole('navigation')
			.getByRole('link', { name: 'Services & Maintenance' })
			.click();
		await page.waitForURL('**/services-maintenance**');
		await page.waitForLoadState('networkidle');

		const getInTouch = page.getByRole('link', { name: 'Get in Touch' });
		if (await getInTouch.first().isVisible().catch(() => false)) {
			await shotWithClick(page, {
				file: 'us01-03-contact.png',
				locator: getInTouch.first(),
				number: 3,
				fullPage: true
			});
		} else {
			await shotWithClick(page, {
				file: 'us01-03-contact.png',
				locator: page.getByRole('link', { name: 'Sign in' }).first(),
				number: 3
			});
		}

		// Document that About Us currently requires sign-in
		await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
		await shotWithClick(page, {
			file: 'us01-04-about-gated.png',
			locator: page
				.getByRole('navigation')
				.getByRole('link', { name: 'About Us' }),
			number: 4
		});
		await page
			.getByRole('navigation')
			.getByRole('link', { name: 'About Us' })
			.click();
		await page.waitForURL('**/sign-in**');
		await shot(page, { file: 'us01-05-about-signin-redirect.png' });

		console.log('US-01 capture complete');
	} finally {
		await browser.close();
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
