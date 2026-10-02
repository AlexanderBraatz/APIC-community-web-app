import {
	BASE_URL,
	launchBrowser,
	shot
} from './docs-capture-lib.mjs';

async function completeOnboardingIfNeeded(page) {
	for (let i = 0; i < 10; i++) {
		if (!page.url().includes('/accept-invite')) return;

		const heading = (
			await page.locator('h1').first().innerText().catch(() => '')
		).trim();
		const headingLower = heading.toLowerCase();
		console.log('Onboarding step:', heading || page.url());

		if (headingLower.includes('privacy')) {
			const checkbox = page.locator('input[type="checkbox"]').first();
			if (!(await checkbox.isChecked())) {
				await checkbox.click({ force: true });
			}
			await page.waitForFunction(() => {
				const btn = [...document.querySelectorAll('button')].find(
					b => b.textContent?.trim() === 'Continue'
				);
				return btn && !btn.disabled;
			});
			await Promise.all([
				page.waitForURL(url => !String(url).includes('step=privacy'), {
					timeout: 30000
				}).catch(() => {}),
				page.getByRole('button', { name: /^Continue$/i }).click()
			]);
			await page.waitForLoadState('domcontentloaded');
			continue;
		}

		if (headingLower.includes('shown name')) {
			await page.locator('#full_name').fill('Carmen Walsh');
			await Promise.all([
				page.waitForURL(url => !String(url).includes('step=name'), {
					timeout: 30000
				}).catch(() => {}),
				page.getByRole('button', { name: /^Continue$/i }).click()
			]);
			await page.waitForLoadState('domcontentloaded');
			continue;
		}

		if (headingLower.includes('colour') || headingLower.includes('color')) {
			await page.getByRole('radio').first().click();
			await page.waitForFunction(() => {
				const btn = [...document.querySelectorAll('button')].find(
					b => b.textContent?.trim() === 'Continue'
				);
				return btn && !btn.disabled;
			});
			await Promise.all([
				page.waitForURL(url => !String(url).includes('step=colour'), {
					timeout: 30000
				}).catch(() => {}),
				page.getByRole('button', { name: /^Continue$/i }).click()
			]);
			await page.waitForLoadState('domcontentloaded');
			continue;
		}

		if (headingLower.includes('favorite')) {
			const skip = page.getByRole('button', { name: /Skip for now/i });
			await page.waitForFunction(() => {
				const btn = [...document.querySelectorAll('button')].find(b =>
					/Skip for now/i.test(b.textContent || '')
				);
				return btn && !btn.disabled && btn.getAttribute('aria-busy') !== 'true';
			}, null, { timeout: 15000 }).catch(() => {});
			await Promise.all([
				page.waitForURL(
					url =>
						!String(url).includes('/accept-invite') ||
						String(url).includes('welcome=1'),
					{ timeout: 45000 }
				).catch(() => {}),
				skip.click({ force: true })
			]);
			await page.waitForLoadState('domcontentloaded');
			continue;
		}

		if (headingLower.includes('password')) {
			await page.locator('#password').fill('12345678910');
			await page.locator('#confirm').fill('12345678910');
			await Promise.all([
				page.waitForURL(url => !String(url).includes('step=password'), {
					timeout: 30000
				}).catch(() => {}),
				page.getByRole('button', { name: /^Continue$/i }).click()
			]);
			await page.waitForLoadState('domcontentloaded');
			continue;
		}

		console.log('Unknown onboarding step, stopping helper');
		break;
	}
}

async function main() {
	const { browser, page } = await launchBrowser();
	try {
		await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
		await page.locator('#email').fill('braatzgerman+carmen-walsh@gmail.com');
		await page.locator('#password').fill('12345678910');

		await Promise.all([
			page.waitForURL(
				url => !String(url).includes('/sign-in'),
				{ timeout: 45000 }
			),
			page.getByRole('button', { name: /sign in/i }).click()
		]);
		await page.waitForLoadState('domcontentloaded');
		console.log('After login URL:', page.url());

		await completeOnboardingIfNeeded(page);

		await page.goto(`${BASE_URL}/members/admin/invitations`, {
			waitUntil: 'domcontentloaded'
		});
		await completeOnboardingIfNeeded(page);

		if (!page.url().includes('/members/admin/invitations')) {
			await page.goto(`${BASE_URL}/members/admin/invitations`, {
				waitUntil: 'domcontentloaded'
			});
		}

		console.log('Invitations URL:', page.url());
		await page.locator('#email').waitFor({ state: 'visible', timeout: 20000 });
		await page.locator('#email').fill('alexander.braatz.creates@gmail.com');

		await Promise.all([
			page.waitForURL(
				url =>
					String(url).includes('message=') || String(url).includes('error='),
				{ timeout: 45000 }
			).catch(() => {}),
			page.getByRole('button', { name: /Send invitation/i }).click()
		]);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(500);

		await shot(page, { file: '_invite-admin-result.png', fullPage: true });

		const url = page.url();
		const text = await page.locator('body').innerText();
		console.log('URL:', url);
		console.log('PAGE TEXT:');
		console.log(text);
	} finally {
		await browser.close();
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
