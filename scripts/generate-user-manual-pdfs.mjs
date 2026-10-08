/**
 * Renders docs/USER_MANUAL_MEMBER.md and docs/USER_MANUAL_ADMIN.md to PDF
 * with embedded screenshots, writing into public/docs/.
 *
 * Uses system Chrome/Chromium headless --print-to-pdf (no Playwright).
 *
 * Usage: npm run docs:manuals-pdf
 *    or: node scripts/generate-user-manual-pdfs.mjs
 */
import { readFile, mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const outDir = path.join(root, 'public', 'docs');

const manuals = [
	{
		source: 'USER_MANUAL_MEMBER.md',
		output: 'apic-community-member-manual.pdf',
		title: 'Member Manual'
	},
	{
		source: 'USER_MANUAL_ADMIN.md',
		output: 'apic-community-admin-manual.pdf',
		title: 'Admin Manual'
	}
];

const chromeCandidates = [
	process.env.CHROME_PATH,
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
	'/usr/bin/google-chrome',
	'/usr/bin/google-chrome-stable',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser'
].filter(Boolean);

function escapeHtml(value) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function buildHtml({ title, bodyHtml }) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      max-width: 48rem;
      font-family: Georgia, "Times New Roman", serif;
      color: #444;
      font-size: 11pt;
      line-height: 1.6;
    }
    h1 {
      color: #805b32;
      font-size: 28pt;
      font-weight: normal;
      margin: 0 0 8pt;
    }
    h2 {
      color: #805b32;
      font-size: 18pt;
      font-weight: normal;
      margin: 28pt 0 10pt;
      padding-top: 18pt;
      border-top: 1px solid #e5e5e5;
      page-break-after: avoid;
    }
    h3 {
      color: #444;
      font-size: 13.5pt;
      font-weight: 500;
      margin: 18pt 0 8pt;
      page-break-after: avoid;
    }
    h4 {
      color: #444;
      font-size: 12pt;
      font-weight: 500;
      margin: 14pt 0 6pt;
      page-break-after: avoid;
    }
    p {
      margin: 8pt 0 0;
      color: #666;
    }
    ul, ol {
      margin: 8pt 0 0;
      padding-left: 1.4em;
      color: #666;
    }
    li {
      margin: 0 0 4pt;
      line-height: 1.55;
    }
    strong { color: #444; font-weight: 500; }
    a { color: #805b32; text-decoration: underline; text-underline-offset: 2px; }
    hr {
      border: none;
      border-top: 1px solid #e5e5e5;
      margin: 22pt 0;
    }
    /* Screenshots: keep step text with its image when possible; after a
       screenshot group, start the next step on a fresh page so bullets
       don't look like they belong to the wrong image when Chrome moves
       an image that didn't fit. Desktop + mobile pairs stay together. */
    ol, ul {
      page-break-after: avoid;
      break-after: avoid-page;
    }
    p:has(> img:only-child) {
      margin: 10pt 0 0;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
    }
    p:has(> img:only-child):has(+ p:has(> img:only-child)) {
      margin-bottom: 4pt;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    p:has(> img:only-child):last-child {
      page-break-after: auto;
      break-after: auto;
    }
    img {
      display: block;
      width: 100%;
      max-width: 48rem;
      height: auto;
      border: 1px solid #e5e5e5;
      border-radius: 2px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

async function markdownToPdfHtml(markdown) {
	const renderer = new marked.Renderer();
	renderer.image = ({ href, text }) => {
		if (!href) return '';
		const abs = path.isAbsolute(href) ? href : path.resolve(docsDir, href);
		const src = pathToFileURL(abs).href;
		return `<img src="${src}" alt="${escapeHtml(text || '')}" />`;
	};
	renderer.link = ({ href, text }) => {
		const safeHref = href || '#';
		return `<a href="${escapeHtml(safeHref)}">${text}</a>`;
	};

	marked.setOptions({ renderer, gfm: true, breaks: false });
	return marked.parse(markdown);
}

async function resolveChrome() {
	for (const candidate of chromeCandidates) {
		try {
			await access(candidate);
			return candidate;
		} catch {
			/* try next */
		}
	}
	throw new Error(
		'Chrome/Chromium not found. Set CHROME_PATH or install Google Chrome.'
	);
}

function runChromePrintToPdf(chromePath, htmlPath, pdfPath) {
	return new Promise((resolve, reject) => {
		const args = [
			'--headless=new',
			'--disable-gpu',
			'--no-pdf-header-footer',
			`--print-to-pdf=${pdfPath}`,
			pathToFileURL(htmlPath).href
		];
		const child = spawn(chromePath, args, {
			stdio: ['ignore', 'pipe', 'pipe']
		});
		let stderr = '';
		child.stderr.on('data', chunk => {
			stderr += chunk.toString();
		});
		child.on('error', reject);
		child.on('close', code => {
			if (code === 0) resolve();
			else
				reject(
					new Error(
						`Chrome exited with code ${code}${stderr ? `\n${stderr}` : ''}`
					)
				);
		});
	});
}

async function main() {
	await mkdir(outDir, { recursive: true });
	const chromePath = await resolveChrome();

	for (const manual of manuals) {
		const markdown = await readFile(path.join(docsDir, manual.source), 'utf8');
		const bodyHtml = await markdownToPdfHtml(markdown);
		const html = buildHtml({ title: manual.title, bodyHtml });
		const htmlPath = path.join(outDir, `${manual.output}.html`);
		const pdfPath = path.join(outDir, manual.output);
		await writeFile(htmlPath, html, 'utf8');
		await runChromePrintToPdf(chromePath, htmlPath, pdfPath);
		await unlink(htmlPath).catch(() => {});
		console.log(`Wrote ${path.relative(root, pdfPath)}`);
	}
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
