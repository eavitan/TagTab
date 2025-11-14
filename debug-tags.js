// Debug script to test tag display functionality
// Run this in browser console to see what getTags() returns

async function debugTagDisplay() {
  console.log('=== Debug Tag Display ===');

  try {
    // Get tags from background
    const res = await chrome.runtime.sendMessage({ type: "getTags" });
    console.log('getTags() response:', res);

    if (res.ok) {
      console.log('Raw tags:', res.tags);

      // Test getTagDisplayName function
      res.tags.forEach((tagInfo, i) => {
        console.log(`Tag ${i}:`, {
          original: tagInfo,
          path: typeof tagInfo === 'string' ? tagInfo : tagInfo.path,
          displayName: getTagDisplayName(tagInfo),
          depth: typeof tagInfo === 'object' ? tagInfo.depth || 0 : 0
        });
      });
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

function getTagDisplayName(tagInfo) {
  console.log('getTagDisplayName called with:', tagInfo);

  if (typeof tagInfo === 'string') {
    console.log('-> returning string as-is:', tagInfo);
    return tagInfo; // Backward compatibility
  }

  const path = tagInfo.path;
  const depth = tagInfo.depth || 0;

  console.log('-> path:', path, 'depth:', depth);

  // For special tags, return as-is
  if (path.startsWith('📁') || path.startsWith('📂')) {
    console.log('-> returning special tag as-is:', path);
    return path;
  }

  // Extract just the tag name for display
  const lastSlash = path.lastIndexOf('/');
  const tagName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;

  console.log('-> extracted tag name:', tagName);
  return tagName;
}

console.log('Run debugTagDisplay() to see what\'s happening with tag display');