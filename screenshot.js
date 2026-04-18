import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5175';
const OUT_DIR = path.resolve('demo/screenshots');

async function ensureDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function saveShot(page, name) {
  await page.screenshot({
    path: path.join(OUT_DIR, name),
    fullPage: false,
    animations: 'disabled',
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 800 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  try {
    await ensureDir();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.fonts?.ready);
    await page.waitForTimeout(2000);

    // 01 overview
    console.log('Taking screenshot 01-overview.png');
    await saveShot(page, '01-overview.png');
    console.log('Screenshot 01-overview.png taken successfully!');

    // 06 chat panel
    console.log('Taking screenshot 06-chat-panel.png');
    await saveShot(page, '06-chat-panel.png');
    console.log('Screenshot 06-chat-panel.png taken successfully!');

    // 07 import-export
    console.log('Taking screenshot 07-import-export.png');
    await saveShot(page, '07-import-export.png');
    console.log('Screenshot 07-import-export.png taken successfully!');

    console.log('All screenshots completed successfully!');
  } catch (err) {
    console.error('Error taking screenshots:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();