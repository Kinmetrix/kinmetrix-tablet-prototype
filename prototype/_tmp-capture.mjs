import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 1180;
const HEIGHT = 820;
const outDir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH + 48, height: HEIGHT + 48 } });

for (const slug of ['login', 'team-home']) {
  await page.goto(`http://localhost:5173/${slug}.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => {
    if (window.KinPrototype?.mountDebugChrome) window.KinPrototype.mountDebugChrome();
    if (window.KinPrototype?.setDebugOpen) window.KinPrototype.setDebugOpen(false);
    if (window.KinPrototype?.mountAvatars) window.KinPrototype.mountAvatars();
    document.body.classList.add('proto-capture');
  });
  await page.waitForTimeout(150);
  const frame = page.locator('.device-frame').first();
  const box = await frame.boundingBox();
  const file = path.join(outDir, `_tmp-${slug}-playwright.png`);
  await page.screenshot({ path: file, clip: { x: box.x, y: box.y, width: WIDTH, height: HEIGHT } });
  console.log(slug, file, box);
}
await browser.close();
