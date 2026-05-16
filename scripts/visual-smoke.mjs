import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const url = process.env.HACKOS_URL || 'http://127.0.0.1:5173';

async function getCanvasBoxes(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('canvas')).map((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      return {
        index,
        x: Math.max(0, Math.floor(rect.x)),
        y: Math.max(0, Math.floor(rect.y)),
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      };
    }),
  );
}

function sampleCanvasRegions(pngBuffer, boxes) {
  const png = PNG.sync.read(pngBuffer);
  return boxes.map((box) => {
    const right = Math.min(png.width, box.x + box.width);
    const bottom = Math.min(png.height, box.y + box.height);
    const stepX = Math.max(1, Math.floor((right - box.x) / 160));
    const stepY = Math.max(1, Math.floor((bottom - box.y) / 120));
    let litPixels = 0;
    let sampled = 0;
    for (let y = box.y; y < bottom; y += stepY) {
      for (let x = box.x; x < right; x += stepX) {
        const offset = (png.width * y + x) * 4;
        const r = png.data[offset];
        const g = png.data[offset + 1];
        const b = png.data[offset + 2];
        const a = png.data[offset + 3];
        sampled += 1;
        if (a > 8 && r + g + b > 44 && Math.max(r, g, b) - Math.min(r, g, b) > 8) litPixels += 1;
      }
    }
    return { ...box, sampled, litPixels };
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[placeholder="operator@hackos"]', { timeout: 22000 });
const welcomeBoxes = await getCanvasBoxes(page);
const welcomeBuffer = await page.screenshot({ path: 'visual-welcome.png', fullPage: false });
const welcomeCanvas = sampleCanvasRegions(welcomeBuffer, welcomeBoxes);

await page.fill('input[placeholder="operator@hackos"]', '}Ne2@rs=tC');
await page.fill('input[type="password"]', 'i32+.NfiqrPQ?_');
await page.getByRole('button', { name: /ENTER/ }).click();
await page.getByText('ACTIVE MODULE').waitFor({ timeout: 140000 });
const dashboardBoxes = await getCanvasBoxes(page);
const dashboardBuffer = await page.screenshot({ path: 'visual-dashboard.png', fullPage: false });
const dashboardCanvas = sampleCanvasRegions(dashboardBuffer, dashboardBoxes);

const report = {
  url,
  welcomeCanvas,
  dashboardCanvas,
  passed:
    welcomeCanvas.some((canvas) => canvas.litPixels > 100) &&
    dashboardCanvas.some((canvas) => canvas.litPixels > 100),
};

await writeFile('visual-report.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();

if (!report.passed) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
