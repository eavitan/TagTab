// Test script to verify classification patterns work correctly
// Run this in browser console after loading the extension

function testClassification() {
  // Test the glob pattern conversion
  function globToRegex(pattern) {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .
    return new RegExp(`^${escaped}$`, 'i');
  }

  // Test URLs that should match Development patterns
  const testUrls = [
    'https://github.com/deepseek-ai/DeepSeek-OCR',
    'https://www.github.com/user/repo',
    'https://api.github.com/repos/user/repo',
    'https://stackoverflow.com/questions/12345/some-question',
    'https://gitlab.com/user/project',
    'http://localhost:3000',
    'https://codepen.io/user/pen/abc123'
  ];

  const developmentPatterns = [
    '*github.com/*', '*gitlab.com/*', '*bitbucket.org/*',
    '*stackoverflow.com/*', '*stackexchange.com/*',
    'localhost:*', '127.0.0.1:*', '*.dev/*', '*.local/*',
    '*codepen.io/*', '*jsfiddle.net/*', '*codesandbox.io/*'
  ];

  console.log('Testing URL classification patterns:');
  console.log('=====================================');

  testUrls.forEach(url => {
    try {
      const urlObj = new URL(url);
      const fullUrl = url.toLowerCase();
      const domain = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      const domainAndPath = domain + pathname;

      console.log(`\nTesting URL: ${url}`);
      console.log(`Domain: ${domain}, Path: ${pathname}`);

      let matched = false;
      developmentPatterns.forEach(pattern => {
        const regex = globToRegex(pattern);
        const matches = regex.test(fullUrl) || regex.test(domain) || regex.test(domainAndPath);

        if (matches) {
          console.log(`✅ MATCHED pattern: ${pattern} (regex: ${regex})`);
          matched = true;
        }
      });

      if (!matched) {
        console.log('❌ No patterns matched');
      }
    } catch (e) {
      console.error(`Error testing ${url}:`, e);
    }
  });
}

// Run the test
testClassification();