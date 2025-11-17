const { chromium } = require('playwright');

(async () => {
  // Launch browser
  const browser = await chromium.launch({
    headless: false // Set to true if you want headless mode
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 } // Set a standard viewport size
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to https://collective-template.framer.website/types/shop...');

    // Navigate to the URL
    await page.goto('https://collective-template.framer.website/types/shop', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Page loaded successfully. Waiting for content to fully render...');

    // Wait a bit more for any dynamic content
    await page.waitForTimeout(3000);

    // Get the full page height to ensure we capture everything
    const bodyHandle = await page.$('body');
    const { height } = await bodyHandle.boundingBox();
    console.log(`Page height: ${height}px`);

    // Take a full page screenshot
    console.log('Taking full page screenshot...');
    await page.screenshot({
      path: '/Users/eavitan/Projects/tagtab-extension/collective-shop-fullpage.png',
      fullPage: true,
      type: 'png'
    });

    console.log('Screenshot saved as: /Users/eavitan/Projects/tagtab-extension/collective-shop-fullpage.png');

    // Also take a viewport screenshot for comparison
    await page.screenshot({
      path: '/Users/eavitan/Projects/tagtab-extension/collective-shop-viewport.png',
      fullPage: false,
      type: 'png'
    });

    console.log('Viewport screenshot saved as: /Users/eavitan/Projects/tagtab-extension/collective-shop-viewport.png');

  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();