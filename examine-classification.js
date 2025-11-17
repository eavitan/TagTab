const { chromium } = require('playwright');

async function examineClassificationEditor() {
    console.log('Starting browser...');
    const browser = await chromium.launch({
        headless: false,
        args: [
            '--load-extension=/Users/eavitan/Projects/tagtab-extension/tagtab-ext',
            '--disable-extensions-except=/Users/eavitan/Projects/tagtab-extension/tagtab-ext',
            '--no-first-run'
        ]
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Navigating to extension settings page...');
        await page.goto('chrome-extension://jbeelbgphijbjgppjdcmklnkieaaiihe/settings.html');

        // Wait for the page to load
        await page.waitForTimeout(2000);

        console.log('Taking initial screenshot...');
        await page.screenshot({ path: 'classification-initial.png', fullPage: true });

        // Look for tag sections
        console.log('Looking for tag sections...');
        const tagSections = await page.locator('.tag-section').count();
        console.log(`Found ${tagSections} tag sections`);

        // Try to find Optibus editor or any classification editor
        console.log('Looking for Optibus tag or any tag with classification...');

        // Get all tag headers
        const tagHeaders = await page.locator('.tag-header').all();
        console.log(`Found ${tagHeaders.length} tag headers`);

        for (let i = 0; i < tagHeaders.length; i++) {
            const headerText = await tagHeaders[i].textContent();
            console.log(`Tag ${i + 1}: ${headerText}`);

            // Check if this is Optibus or has classification
            if (headerText.toLowerCase().includes('optibus') || headerText.toLowerCase().includes('classification')) {
                console.log(`Found target tag: ${headerText}`);

                // Click on it if it's collapsible
                const toggleButton = tagHeaders[i].locator('button');
                if (await toggleButton.count() > 0) {
                    await toggleButton.click();
                    await page.waitForTimeout(500);
                }
                break;
            }
        }

        // Look for classification rules form
        console.log('Looking for classification rules...');
        const rulesContainer = page.locator('.classification-rules');
        if (await rulesContainer.count() > 0) {
            console.log('Found classification rules container');
            await page.screenshot({ path: 'classification-rules.png' });
        }

        // Look for condition groups
        const conditionGroups = await page.locator('.condition-group').count();
        console.log(`Found ${conditionGroups} condition groups`);

        // Look for preview text
        const previewElements = await page.locator('.preview, .conditions-preview, .rule-preview').all();
        console.log(`Found ${previewElements.length} preview elements`);

        for (let preview of previewElements) {
            const text = await preview.textContent();
            if (text && text.trim()) {
                console.log('Preview text found:', text.trim());
            }
        }

        // Take screenshot of the entire page
        console.log('Taking full page screenshot...');
        await page.screenshot({ path: 'classification-full-page.png', fullPage: true });

        // Examine the HTML structure
        console.log('Examining HTML structure...');
        const bodyHTML = await page.locator('body').innerHTML();

        // Save the HTML structure to a file for examination
        require('fs').writeFileSync('classification-html-structure.html', bodyHTML);

        // Look for JavaScript files referenced in the page
        console.log('Looking for JavaScript files...');
        const scripts = await page.locator('script[src]').all();
        for (let script of scripts) {
            const src = await script.getAttribute('src');
            console.log('Script:', src);
        }

        // Check if settings.js is loaded and examine its content
        console.log('Examining page JavaScript...');
        const jsContent = await page.evaluate(() => {
            // Look for classification-related functions
            const functions = [];
            for (let prop in window) {
                if (typeof window[prop] === 'function' && prop.toLowerCase().includes('classif')) {
                    functions.push(prop);
                }
            }
            return functions;
        });
        console.log('Classification-related functions:', jsContent);

        // Try to find and examine the condition builder
        console.log('Looking for condition builder elements...');
        const conditionSelects = await page.locator('select[name*="condition"], select[name*="operator"]').count();
        console.log(`Found ${conditionSelects} condition/operator selects`);

        const conditionInputs = await page.locator('input[name*="value"], input[name*="pattern"]').count();
        console.log(`Found ${conditionInputs} condition value inputs`);

        // Look for form elements in general
        const formElements = await page.locator('form, .form-group, .condition-row').count();
        console.log(`Found ${formElements} form-related elements`);

        // Take a final screenshot focusing on any visible forms
        if (formElements > 0) {
            await page.screenshot({ path: 'classification-forms.png' });
        }

    } catch (error) {
        console.error('Error examining classification editor:', error);
        await page.screenshot({ path: 'classification-error.png' });
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

examineClassificationEditor().catch(console.error);