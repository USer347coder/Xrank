import { chromium as playwright } from 'playwright-core';
import type { Browser } from 'playwright-core';

const CHROMIUM_PACK_URL =
  'https://github.com/nichochar/chromium-for-lambda/releases/download/v133.0.0/chromium-v133.0.0-pack.tar';

/**
 * Launch a headless Chromium browser.
 * - In production (Netlify/Lambda): uses @sparticuz/chromium-min
 * - In development (local): uses locally installed Playwright browser
 */
export async function launchBrowser(): Promise<Browser> {
  const isDev =
    process.env.NETLIFY_DEV === 'true' ||
    process.env.NODE_ENV === 'development' ||
    !process.env.LAMBDA_TASK_ROOT; // Lambda sets this in production

  if (isDev) {
    console.log('[chromium] Dev mode — using local Playwright browser');
    return playwright.launch({ headless: true });
  }

  console.log('[chromium] Production — using @sparticuz/chromium-min');
  const chromium = await import('@sparticuz/chromium-min');
  const chromiumMod = chromium.default || chromium;

  // Disable GPU for lower memory usage
  if (typeof chromiumMod.setGraphicsMode === 'function') {
    chromiumMod.setGraphicsMode = false;
  }

  const executablePath = await chromiumMod.executablePath(CHROMIUM_PACK_URL);

  return playwright.launch({
    args: chromiumMod.args,
    executablePath,
    headless: true,
  });
}
