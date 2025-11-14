// Test script to debug CTO classification
// Run this in browser console to test the pattern matching

function testCTOClassification() {
  // Simulate the improved URL matching logic
  function globToRegex(pattern) {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`, 'i');
  }

  function matchesUrlPatterns(url, patterns) {
    if (!url || !patterns) return false;

    try {
      const urlObj = new URL(url);
      const fullUrl = url.toLowerCase();
      const domain = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      const domainAndPath = domain + pathname;

      // Extract URL without query parameters
      const urlWithoutParams = (urlObj.origin + urlObj.pathname).toLowerCase();

      // Extract all text from URL for keyword-style matching
      const urlText = fullUrl.replace(/[^\w\.]/g, ' ').toLowerCase();

      return patterns.some(pattern => {
        const regex = globToRegex(pattern);

        const tests = [
          regex.test(fullUrl),
          regex.test(urlWithoutParams),
          regex.test(domain),
          regex.test(domainAndPath),
          urlText.includes(pattern.toLowerCase().replace(/\*/g, ''))
        ];

        console.log(`Testing pattern "${pattern}" against URL "${url}":`, {
          fullUrl,
          urlWithoutParams,
          domain,
          domainAndPath,
          urlText,
          pattern: pattern.toLowerCase().replace(/\*/g, ''),
          tests,
          result: tests.some(test => test)
        });

        return tests.some(test => test);
      });
    } catch (e) {
      console.error('Error matching URL patterns:', e);
      return false;
    }
  }

  // Test the problematic URLs
  const testUrls = [
    'https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Actoisraeltours.com&hl=en',
    'https://search.google.com/search-console/index?resource_id=sc-domain%3Actoisraeltours.com'
  ];

  const patterns = ['ctoisraeltours'];

  console.log('=== CTO Classification Test ===');
  testUrls.forEach(url => {
    console.log(`\nTesting: ${url}`);
    const matches = matchesUrlPatterns(url, patterns);
    console.log(`Result: ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
  });

  // Also test some variations that should work
  const testPatterns = [
    'ctoisraeltours',      // Current pattern
    '*ctoisraeltours*',    // Wildcard pattern
    '*search.google.com*', // Domain pattern
    '*search-console*'     // Path pattern
  ];

  console.log('\n=== Pattern Variations Test ===');
  testPatterns.forEach(pattern => {
    console.log(`\nTesting pattern: "${pattern}"`);
    testUrls.forEach(url => {
      const matches = matchesUrlPatterns(url, [pattern]);
      console.log(`  ${url.substring(0, 80)}... → ${matches ? '✅' : '❌'}`);
    });
  });
}

// Run the test
testCTOClassification();