const { chromium } = require('playwright');

async function takeScreenshot() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to the website...');
    await page.goto('https://collective-template.framer.website/types/shop', {
      waitUntil: 'networkidle'
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    console.log('Taking screenshot...');
    await page.screenshot({
      path: 'collective-website-screenshot.png',
      fullPage: true
    });

    console.log('Screenshot saved as collective-website-screenshot.png');

  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshot();