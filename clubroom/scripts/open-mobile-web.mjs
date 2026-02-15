import { chromium, devices } from 'playwright';

const url = process.env.UI_BASE_URL || 'http://localhost:8083';
const deviceName = process.env.UI_DEVICE || 'iPhone 13';
const browserChannel = process.env.UI_BROWSER_CHANNEL || 'chrome';
const isHeadless = process.env.UI_HEADLESS === '1';
const device = devices[deviceName];

if (!device) {
  console.error(`Unknown device "${deviceName}". Try "iPhone 13".`);
  process.exit(1);
}

let browser;
try {
  browser = await chromium.launch({
    channel: browserChannel,
    headless: isHeadless,
  });
} catch (error) {
  console.warn(
    `Failed to launch channel "${browserChannel}", falling back to bundled Chromium. ${String(error)}`,
  );
  browser = await chromium.launch({
    headless: isHeadless,
  });
}

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  userAgent: device.userAgent,
  locale: 'en-US',
  colorScheme: 'light',
});

const page = await context.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

const environment = await page.evaluate(() => ({
  userAgent: navigator.userAgent,
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio,
  touchPoints: navigator.maxTouchPoints,
}));

console.log(
  `Opened ${url} in forced iPhone mode (${deviceName}, channel: ${browserChannel})`,
);
console.log(environment);

if (environment.width > 500 || environment.touchPoints < 1 || !environment.userAgent.includes('iPhone')) {
  console.error('Mobile emulation failed. Aborting.');
  await context.close().catch(() => undefined);
  await browser.close().catch(() => undefined);
  process.exit(1);
}

console.log('Keep this terminal open; press Ctrl+C to close the emulated window.');

const closeAll = async () => {
  await context.close().catch(() => undefined);
  await browser.close().catch(() => undefined);
  process.exit(0);
};

process.on('SIGINT', closeAll);
process.on('SIGTERM', closeAll);

await new Promise(() => {});
