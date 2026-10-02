import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const SCREENSHOT_DIR = path.join(ROOT, 'docs', 'screenshots');
export const BASE_URL = process.env.DOCS_BASE_URL || 'http://localhost:3000';

export async function launchBrowser(options = {}) {
	const browser = await chromium.launch({
		executablePath:
			'/Users/alexanderbraatz/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
		headless: true,
		args: ['--no-sandbox', '--disable-dev-shm-usage'],
		...options.launch
	});
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: 1,
		...options.context
	});
	const page = await context.newPage();
	page.setDefaultTimeout(30000);
	return { browser, context, page };
}

/** Inject a numbered click badge over a locator, screenshot, then remove it. */
export async function shotWithClick(page, {
	file,
	locator,
	number,
	fullPage = false,
	scrollIntoView = true
}) {
	const target = typeof locator === 'string' ? page.locator(locator) : locator;
	await target.first().waitFor({ state: 'visible' });
	if (scrollIntoView) {
		await target.first().scrollIntoViewIfNeeded();
	}
	const box = await target.first().boundingBox();
	if (!box) throw new Error(`No bounding box for click target (shot ${file})`);

	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;

	await page.evaluate(
		({ cx, cy, number }) => {
			document.getElementById('doc-click-indicator')?.remove();
			const el = document.createElement('div');
			el.id = 'doc-click-indicator';
			el.textContent = String(number);
			el.setAttribute(
				'style',
				[
					'position:fixed',
					`left:${cx}px`,
					`top:${cy}px`,
					'transform:translate(-50%,-50%)',
					'width:36px',
					'height:36px',
					'border-radius:9999px',
					'background:#c0392b',
					'color:#fff',
					'font:700 18px/36px system-ui,sans-serif',
					'text-align:center',
					'z-index:2147483647',
					'box-shadow:0 0 0 3px #fff,0 2px 8px rgba(0,0,0,.35)',
					'pointer-events:none'
				].join(';')
			);
			document.body.appendChild(el);
		},
		{ cx, cy, number }
	);

	// Brief settle so layout/fonts are stable
	await page.waitForTimeout(150);
	const out = path.join(SCREENSHOT_DIR, file);
	await page.screenshot({ path: out, fullPage });
	await page.evaluate(() =>
		document.getElementById('doc-click-indicator')?.remove()
	);
	console.log('wrote', out);
	return out;
}

/** Screenshot without click indicator (result / landing states). */
export async function shot(page, { file, fullPage = false }) {
	const out = path.join(SCREENSHOT_DIR, file);
	await page.waitForTimeout(150);
	await page.screenshot({ path: out, fullPage });
	console.log('wrote', out);
	return out;
}

export async function fillField(page, labelOrSelector, value) {
	if (labelOrSelector.startsWith('#') || labelOrSelector.startsWith('[') || labelOrSelector.includes('>>')) {
		await page.locator(labelOrSelector).fill(value);
		return;
	}
	await page.getByLabel(labelOrSelector, { exact: true }).fill(value);
}
