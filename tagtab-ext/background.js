// background.js (MV3 service worker)
// Storage schema:
//  storage.local: {
//    tags: {
//      [tagName]: [{ url, title, favIconUrl, savedAt }...]
//    },
//    tagSettings: {
//      [tagName]: { icon, color, classificationRules, restoreBehavior }
//    },
//    globalSettings: { defaultRestoreMode, enableClassification, ... }
//    classificationRules: { [tagName]: { urlPatterns, titleKeywords } }
//  }

// Tab classification engine embedded directly
class TabClassifier {
  constructor() {
    this.defaultRules = {
      'Development': {
        urlPatterns: [
          '*github.com/*', '*gitlab.com/*', '*bitbucket.org/*',
          '*stackoverflow.com/*', '*stackexchange.com/*',
          'localhost:*', '127.0.0.1:*', '*.dev/*', '*.local/*',
          '*codepen.io/*', '*jsfiddle.net/*', '*codesandbox.io/*'
        ],
        titleKeywords: ['github', 'git', 'code', 'repository', 'commit', 'pull request', 'api', 'documentation']
      },
      'Learning': {
        urlPatterns: [
          '*youtube.com/watch*', '*coursera.org/*', '*udemy.com/*',
          '*edx.org/*', '*khanacademy.org/*', '*codecademy.com/*',
          '*freecodecamp.org/*', '*pluralsight.com/*'
        ],
        titleKeywords: ['tutorial', 'course', 'learn', 'training', 'guide', 'how to', 'documentation', 'docs']
      },
      'Social': {
        urlPatterns: [
          '*twitter.com/*', '*facebook.com/*', '*instagram.com/*',
          '*linkedin.com/*', '*reddit.com/*', '*discord.com/*',
          '*slack.com/*', '*telegram.org/*'
        ],
        titleKeywords: ['social', 'chat', 'message', 'post', 'tweet', 'share']
      },
      'Shopping': {
        urlPatterns: [
          '*amazon.com/*', '*ebay.com/*', '*etsy.com/*',
          '*walmart.com/*', '*target.com/*', '*bestbuy.com/*',
          '*shopify.com/*', '*aliexpress.com/*'
        ],
        titleKeywords: ['buy', 'shop', 'cart', 'price', 'deal', 'sale', 'order', 'checkout']
      },
      'News': {
        urlPatterns: [
          '*bbc.com/*', '*cnn.com/*', '*reuters.com/*',
          '*theguardian.com/*', '*nytimes.com/*', '*washingtonpost.com/*',
          '*techcrunch.com/*', '*ycombinator.com/*'
        ],
        titleKeywords: ['news', 'breaking', 'report', 'article', 'update', 'latest']
      }
    };
  }

  // Convert glob pattern to regex
  globToRegex(pattern) {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .
    return new RegExp(`^${escaped}$`, 'i');
  }

  // Check if URL matches any pattern in the list
  matchesUrlPatterns(url, patterns) {
    if (!url || !patterns) return false;

    try {
      const urlObj = new URL(url);
      const fullUrl = url.toLowerCase();
      const domain = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      const domainAndPath = domain + pathname;

      // Extract URL without query parameters for cleaner matching
      const urlWithoutParams = (urlObj.origin + urlObj.pathname).toLowerCase();

      // Extract all text from URL for keyword-style matching
      const urlText = fullUrl.replace(/[^\w\.]/g, ' ').toLowerCase();

      return patterns.some(pattern => {
        const regex = this.globToRegex(pattern);

        // Test multiple variations
        const tests = [
          regex.test(fullUrl),           // Full URL with params
          regex.test(urlWithoutParams),  // URL without params
          regex.test(domain),            // Domain only
          regex.test(domainAndPath),     // Domain + path
          urlText.includes(pattern.toLowerCase().replace(/\*/g, '')) // Simple text search
        ];

        return tests.some(test => test);
      });
    } catch (e) {
      console.error('Error matching URL patterns:', e);
      return false;
    }
  }

  // Check if title contains any keywords
  matchesTitleKeywords(title, keywords) {
    if (!title || !keywords) return false;

    const titleLower = title.toLowerCase();
    return keywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      // Remove wildcards for simple text matching in titles
      const cleanKeyword = keywordLower.replace(/\*/g, '');
      return titleLower.includes(cleanKeyword);
    });
  }

  // Get classification rules from storage or use defaults
  async getClassificationRules() {
    try {
      const result = await chrome.storage.local.get({ classificationRules: null });
      return result.classificationRules || this.defaultRules;
    } catch (e) {
      console.error('Error getting classification rules:', e);
      return this.defaultRules;
    }
  }

  // Save classification rules to storage
  async saveClassificationRules(rules) {
    try {
      await chrome.storage.local.set({ classificationRules: rules });
    } catch (e) {
      console.error('Error saving classification rules:', e);
    }
  }

  // Classify a single tab
  async classifyTab(tab) {
    const rules = await this.getClassificationRules();
    const matches = [];

    for (const [tagName, rule] of Object.entries(rules)) {
      const urlMatch = this.matchesUrlPatterns(tab.url, rule.urlPatterns);
      const titleMatch = this.matchesTitleKeywords(tab.title, rule.titleKeywords);

      if (urlMatch || titleMatch) {
        matches.push({
          tag: tagName,
          confidence: urlMatch && titleMatch ? 1.0 : 0.7,
          reason: urlMatch && titleMatch ? 'url+title' : urlMatch ? 'url' : 'title'
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  // Get suggested tag for a tab (highest confidence match)
  async getSuggestedTag(tab) {
    const matches = await this.classifyTab(tab);
    return matches.length > 0 ? matches[0].tag : 'Other';
  }

  // Reset to default rules
  async resetToDefaults() {
    await this.saveClassificationRules(this.defaultRules);
    return this.defaultRules;
  }

  // Add custom rule
  async addCustomRule(tagName, urlPatterns = [], titleKeywords = []) {
    const rules = await this.getClassificationRules();
    rules[tagName] = {
      urlPatterns: [...(rules[tagName]?.urlPatterns || []), ...urlPatterns],
      titleKeywords: [...(rules[tagName]?.titleKeywords || []), ...titleKeywords]
    };
    await this.saveClassificationRules(rules);
    return rules;
  }

  // Remove rule
  async removeRule(tagName) {
    const rules = await this.getClassificationRules();
    delete rules[tagName];
    await this.saveClassificationRules(rules);
    return rules;
  }

  // Check if an item matches the given classification rules
  async matchesRules(item, rules) {
    if (!rules) return false;

    // Handle advanced rules structure
    if (rules.advancedRules && rules.advancedRules.length > 0) {
      return this.evaluateAdvancedRules(item, rules.advancedRules);
    }

    // Handle legacy structure
    const urlMatches = rules.urlPatterns && rules.urlPatterns.length > 0
      ? this.matchesUrlPatterns(item.url, rules.urlPatterns)
      : false;

    const titleMatches = rules.titleKeywords && rules.titleKeywords.length > 0
      ? this.matchesTitleKeywords(item.title || '', rules.titleKeywords)
      : false;

    // Default to OR logic for legacy rules
    return urlMatches || titleMatches;
  }

  // Evaluate advanced rules with AND/OR logic
  evaluateAdvancedRules(item, advancedRules) {
    for (const group of advancedRules) {
      if (this.evaluateRuleGroup(item, group)) {
        return true; // OR between groups - any group matching is enough
      }
    }
    return false;
  }

  // Evaluate a single rule group (AND logic within group)
  evaluateRuleGroup(item, group) {
    if (!group.conditions || group.conditions.length === 0) {
      return false;
    }

    for (const condition of group.conditions) {
      if (!this.evaluateCondition(item, condition)) {
        return false; // AND logic - all conditions must match
      }
    }
    return true;
  }

  // Evaluate a single condition
  evaluateCondition(item, condition) {
    const { type, value } = condition;
    if (!value) return false;

    switch (type) {
      case 'url':
        return this.matchesUrlPatterns(item.url, [value]);
      case 'title':
        return this.matchesTitleKeywords(item.title || '', [value]);
      case 'domain':
        try {
          const itemDomain = new URL(item.url).hostname;
          return itemDomain.includes(value) || value.includes(itemDomain);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }
}

const classifier = new TabClassifier();

const getStore = () => new Promise(resolve => {
  chrome.storage.local.get({
    tags: {},
    tagSettings: {},
    tagHierarchy: {},
    globalSettings: {
      defaultRestoreMode: 'close',
      enableClassification: true,
      enableNewTabOverride: true
    }
  }, resolve);
});

const setStore = (data) => new Promise(resolve => {
  chrome.storage.local.set(data, resolve);
});

// Hierarchical tag helper functions
class TagHierarchy {
  static getParentTag(tagPath) {
    const lastSlash = tagPath.lastIndexOf('/');
    return lastSlash > 0 ? tagPath.substring(0, lastSlash) : null;
  }

  static getTagName(tagPath) {
    const lastSlash = tagPath.lastIndexOf('/');
    return lastSlash >= 0 ? tagPath.substring(lastSlash + 1) : tagPath;
  }

  static isChildOf(childPath, parentPath) {
    return childPath.startsWith(parentPath + '/');
  }

  static getDepth(tagPath) {
    return (tagPath.match(/\//g) || []).length;
  }

  static buildHierarchyFromTags(tags) {
    const hierarchy = {};
    const tagPaths = Object.keys(tags).filter(tag =>
      !tag.startsWith('📁') && !tag.startsWith('📂') // Exclude special tags
    );

    // Initialize all tags in hierarchy
    tagPaths.forEach(tagPath => {
      const parent = this.getParentTag(tagPath);

      hierarchy[tagPath] = {
        parent: parent,
        children: [],
        collapsed: false,
        depth: this.getDepth(tagPath)
      };
    });

    // Build parent-child relationships
    tagPaths.forEach(tagPath => {
      const parent = this.getParentTag(tagPath);
      if (parent && hierarchy[parent]) {
        hierarchy[parent].children.push(tagPath);
      }
    });

    return hierarchy;
  }

  static async updateHierarchy() {
    const { tags, tagHierarchy } = await getStore();
    const newHierarchy = this.buildHierarchyFromTags(tags);

    // Preserve collapsed states from existing hierarchy
    Object.keys(newHierarchy).forEach(tagPath => {
      if (tagHierarchy[tagPath]) {
        newHierarchy[tagPath].collapsed = tagHierarchy[tagPath].collapsed;
      }
    });

    await setStore({ tagHierarchy: newHierarchy });
    return newHierarchy;
  }
}

const getTagSettings = async (tagName) => {
  const { tagSettings } = await getStore();
  return tagSettings[tagName] || {
    icon: null,
    color: null,
    restoreBehavior: null // null means use global default
  };
};

const setTagSettings = async (tagName, settings) => {
  const { tagSettings } = await getStore();
  tagSettings[tagName] = { ...tagSettings[tagName], ...settings };
  await setStore({ tagSettings });
};

const getGlobalSettings = async () => {
  const { globalSettings } = await getStore();
  return globalSettings;
};

const setGlobalSettings = async (settings) => {
  const { globalSettings } = await getStore();
  const updatedSettings = { ...globalSettings, ...settings };
  await setStore({ globalSettings: updatedSettings });
};

async function ensureTag(tags, tag) {
  if (!tags[tag]) tags[tag] = [];
}

function nowISO() {
  return new Date().toISOString();
}

async function saveTabsToTag(tag, scope = "currentWindow", useClassification = false) {
  const { tags, globalSettings } = await getStore();
  await ensureTag(tags, tag);

  const query = scope === "allWindows" ? { pinned: false } : { currentWindow: true, pinned: false };
  const tabs = await chrome.tabs.query(query);
  // Filter usable tabs (http/https/chrome-extension/etc.) but skip chrome:// and about:blank
  const closable = tabs.filter(t => t.url && !t.url.startsWith("chrome://") && !t.url.startsWith("edge://") && !t.url.startsWith("about:blank"));

  // If classification is enabled and no specific tag provided, classify tabs
  if (useClassification && globalSettings.enableClassification) {
    for (const t of closable) {
      const suggestedTag = await classifier.getSuggestedTag(t);
      const targetTag = suggestedTag === 'Other' ? "Other" : suggestedTag;

      await ensureTag(tags, targetTag);
      tags[targetTag].push({
        url: t.url,
        title: t.title || t.url,
        favIconUrl: t.favIconUrl || "",
        savedAt: nowISO(),
        classifiedAs: suggestedTag !== 'Other' ? suggestedTag : 'Other'
      });
    }
  } else {
    // Save all tabs to the specified tag
    for (const t of closable) {
      tags[tag].push({
        url: t.url,
        title: t.title || t.url,
        favIconUrl: t.favIconUrl || "",
        savedAt: nowISO()
      });
    }
  }

  await setStore({ tags });

  // Create a new tab first to avoid window closing
  await chrome.tabs.create({ url: "chrome://newtab" });

  // Close the old tabs
  const toClose = closable.map(t => t.id).filter(Boolean);
  if (toClose.length) {
    await chrome.tabs.remove(toClose);
  }
  return { saved: closable.length };
}

async function getTags() {
  const { tags, tagHierarchy } = await getStore();

  // Update hierarchy if needed
  const hierarchy = Object.keys(tagHierarchy).length === 0
    ? await TagHierarchy.updateHierarchy()
    : tagHierarchy;

  const regularTags = Object.keys(tags).filter(tag =>
    !tag.startsWith('📁') && !tag.startsWith('📂')
  );

  // Build hierarchical structure
  const rootTags = regularTags.filter(tag => !TagHierarchy.getParentTag(tag));
  const sortedTags = [];

  function addTagAndChildren(tagPath, depth = 0) {
    sortedTags.push({ path: tagPath, depth, hierarchy: hierarchy[tagPath] });

    if (hierarchy[tagPath] && !hierarchy[tagPath].collapsed) {
      const children = hierarchy[tagPath].children.sort();
      children.forEach(child => addTagAndChildren(child, depth + 1));
    }
  }

  // Add root tags and their children
  rootTags.sort().forEach(rootTag => addTagAndChildren(rootTag));

  // Add special tags at the beginning
  const specialTags = [];

  // Add "All" tag if there are any saved tabs
  const hasAnyTabs = regularTags.some(tag => tags[tag] && tags[tag].length > 0);
  if (hasAnyTabs) {
    specialTags.push({ path: "📁 All", depth: 0, hierarchy: null });
  }

  // Add "Other" tag if there are any unclassified tabs
  if (tags["Other"] && tags["Other"].length > 0) {
    specialTags.push({ path: "📂 Other", depth: 0, hierarchy: null });
  }

  return [...specialTags, ...sortedTags];
}

async function getTagsFlat() {
  const { tags } = await getStore();
  const regularTags = Object.keys(tags).filter(tag =>
    !tag.startsWith('📁') && !tag.startsWith('📂')
  ).sort();

  // Add special tags at the beginning
  const specialTags = [];

  // Add "All" tag if there are any saved tabs
  const hasAnyTabs = regularTags.some(tag => tags[tag] && tags[tag].length > 0);
  if (hasAnyTabs) {
    specialTags.push("📁 All");
  }

  // Add "Other" tag if there are any unclassified tabs
  if (tags["Other"] && tags["Other"].length > 0) {
    specialTags.push("📂 Other");
  }

  return [...specialTags, ...regularTags];
}

async function getTagData(tag) {
  const { tags, tagHierarchy } = await getStore();

  // Handle special "All" tag - return all tabs from all tags
  if (tag === "📁 All") {
    const allTabs = [];
    for (const [tagName, tabList] of Object.entries(tags)) {
      if (tabList && Array.isArray(tabList)) {
        // Add tag information to each tab for display
        const tabsWithTag = tabList.map(tab => ({
          ...tab,
          sourceTag: tagName
        }));
        allTabs.push(...tabsWithTag);
      }
    }
    // Sort by savedAt date (newest first)
    return allTabs.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }

  // Handle special "Other" tag - map to regular "Other" tag
  if (tag === "📂 Other") {
    return tags["Other"] || [];
  }

  // For hierarchical tags, include items from the tag and all its children
  const allItems = [];

  // Add items from the parent tag itself
  if (tags[tag]) {
    const itemsWithTag = tags[tag].map(item => ({
      ...item,
      sourceTag: tag
    }));
    allItems.push(...itemsWithTag);
  }

  // Add items from all child tags
  if (tagHierarchy[tag] && tagHierarchy[tag].children) {
    for (const childTag of tagHierarchy[tag].children) {
      if (tags[childTag]) {
        const childItemsWithTag = tags[childTag].map(item => ({
          ...item,
          sourceTag: childTag
        }));
        allItems.push(...childItemsWithTag);
      }

      // Recursively add items from grandchildren
      const grandchildItems = await getChildTagItems(childTag, tags, tagHierarchy);
      allItems.push(...grandchildItems);
    }
  }

  // Sort by savedAt date (newest first)
  return allItems.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

// Helper function to recursively get items from child tags
async function getChildTagItems(parentTag, tags, tagHierarchy) {
  const items = [];

  if (tagHierarchy[parentTag] && tagHierarchy[parentTag].children) {
    for (const childTag of tagHierarchy[parentTag].children) {
      if (tags[childTag]) {
        const childItemsWithTag = tags[childTag].map(item => ({
          ...item,
          sourceTag: childTag
        }));
        items.push(...childItemsWithTag);
      }

      // Recursively get items from grandchildren
      const grandchildItems = await getChildTagItems(childTag, tags, tagHierarchy);
      items.push(...grandchildItems);
    }
  }

  return items;
}

async function deleteItem(tag, index) {
  const { tags } = await getStore();

  // Handle special "Other" tag
  if (tag === "📂 Other") {
    if (!tags["Other"]) return;
    tags["Other"].splice(index, 1);
    await setStore({ tags });
    return;
  }

  // Handle special "All" tag - this shouldn't happen with the new frontend logic
  if (tag === "📁 All") {
    console.warn("Attempted to delete from 'All' tag - this should be handled by frontend");
    return; // Silently ignore instead of throwing error
  }

  // Regular tag
  if (!tags[tag]) return;
  tags[tag].splice(index, 1);
  await setStore({ tags });
}

async function deleteItemById(itemUrl, itemSavedAt) {
  const { tags } = await getStore();
  let deleted = false;

  // Search through all tags to find and delete the item
  for (const [tagName, items] of Object.entries(tags)) {
    if (!Array.isArray(items)) continue;

    const itemIndex = items.findIndex(item =>
      item.url === itemUrl && item.savedAt === itemSavedAt
    );

    if (itemIndex !== -1) {
      items.splice(itemIndex, 1);
      deleted = true;
      console.log(`Deleted item from tag "${tagName}":`, itemUrl);
      break; // Assuming items are unique, we can stop after first match
    }
  }

  if (deleted) {
    await setStore({ tags });
  }

  return deleted;
}

async function createTag(tagName) {
  const { tags } = await getStore();

  // Check if tag already exists
  if (tags[tagName]) {
    throw new Error(`Tag "${tagName}" already exists`);
  }

  // Create the new tag
  tags[tagName] = [];

  // Update hierarchy
  await setStore({ tags });
  await TagHierarchy.updateHierarchy();

  return tagName;
}

async function createSubTag(parentPath, subTagName) {
  const { tags, tagHierarchy } = await getStore();
  const newTagPath = `${parentPath}/${subTagName}`;

  // Check if tag already exists
  if (tags[newTagPath]) {
    throw new Error(`Tag "${newTagPath}" already exists`);
  }

  // Create the new tag
  tags[newTagPath] = [];

  // Update hierarchy
  await setStore({ tags });
  await TagHierarchy.updateHierarchy();

  return newTagPath;
}

async function moveTag(fromPath, toParentPath) {
  const { tags } = await getStore();

  // Validate move operation
  if (toParentPath && TagHierarchy.isChildOf(toParentPath, fromPath)) {
    throw new Error("Cannot move a tag into its own subtree");
  }

  const tagName = TagHierarchy.getTagName(fromPath);
  const newPath = toParentPath ? `${toParentPath}/${tagName}` : tagName;

  if (tags[newPath]) {
    throw new Error(`Tag "${newPath}" already exists`);
  }

  // Move the tag data
  tags[newPath] = tags[fromPath];
  delete tags[fromPath];

  // Move all child tags recursively
  const childrenToMove = Object.keys(tags).filter(tagPath =>
    TagHierarchy.isChildOf(tagPath, fromPath)
  );

  childrenToMove.forEach(childPath => {
    const relativePath = childPath.substring(fromPath.length + 1);
    const newChildPath = `${newPath}/${relativePath}`;
    tags[newChildPath] = tags[childPath];
    delete tags[childPath];
  });

  await setStore({ tags });
  await TagHierarchy.updateHierarchy();

  return newPath;
}

async function toggleTagCollapse(tagPath) {
  const { tagHierarchy } = await getStore();

  if (tagHierarchy[tagPath]) {
    tagHierarchy[tagPath].collapsed = !tagHierarchy[tagPath].collapsed;
    await setStore({ tagHierarchy });
    return tagHierarchy[tagPath].collapsed;
  }

  return false;
}

async function deleteTag(tag) {
  const { tags } = await getStore();

  // Prevent deletion of special tags
  if (tag === "📁 All") {
    throw new Error("Cannot delete the 'All' tag - it's a special virtual tag.");
  }

  if (tag === "📂 Other") {
    // Allow deletion of Other tag, but just clear it
    tags["Other"] = [];
    await setStore({ tags });
    return;
  }

  // Regular tag deletion
  delete tags[tag];
  await setStore({ tags });
}

async function syncTagConditions(targetTag) {
  const { tags, tagSettings } = await getStore();

  // Get the classification rules for the target tag
  const targetSettings = tagSettings[targetTag];
  if (!targetSettings || !targetSettings.classificationRules) {
    return 0; // No rules to sync
  }

  const rules = targetSettings.classificationRules;
  let importedCount = 0;

  // Go through all other tags and find matching items
  for (const [sourceTag, items] of Object.entries(tags)) {
    if (sourceTag === targetTag || sourceTag === "📁 All" || sourceTag === "📂 Other") {
      continue; // Skip self and special tags
    }

    // Check each item in the source tag against target tag's rules
    const matchingItems = [];
    for (const item of items) {
      if (await classifier.matchesRules(item, rules)) {
        matchingItems.push(item);
      }
    }

    // Move matching items to target tag
    if (matchingItems.length > 0) {
      // Ensure target tag exists
      if (!tags[targetTag]) {
        tags[targetTag] = [];
      }

      // Add items to target tag (avoid duplicates)
      for (const item of matchingItems) {
        const exists = tags[targetTag].some(existing =>
          existing.url === item.url && existing.savedAt === item.savedAt
        );
        if (!exists) {
          tags[targetTag].push(item);
          importedCount++;
        }
      }

      // Remove items from source tag
      tags[sourceTag] = items.filter(item =>
        !matchingItems.some(matching =>
          matching.url === item.url && matching.savedAt === item.savedAt
        )
      );
    }
  }

  await setStore({ tags });
  return importedCount;
}

async function restoreItem(item) {
  await chrome.tabs.create({ url: item.url });
}

async function restoreAll(tag) {
  const list = await getTagData(tag);
  for (const item of list) {
    await restoreItem(item);
  }

  // For special tags, don't clear the source data
  if (tag === "📁 All") {
    // Don't clear anything for "All" tag - it's just a view
    return;
  }

  if (tag === "📂 Other") {
    // Clear the Other tag after restoring
    const { tags } = await getStore();
    tags["Other"] = [];
    await setStore({ tags });
    return;
  }

  // For regular tags, this would be handled by existing restore logic
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "getTags") {
        const list = await getTags();
        sendResponse({ ok: true, tags: list });
      } else if (msg.type === "saveAndClose") {
        const { tag, scope, useClassification } = msg;
        const res = await saveTabsToTag(tag, scope, useClassification);
        sendResponse({ ok: true, ...res });
      } else if (msg.type === "getTagData") {
        const list = await getTagData(msg.tag);
        sendResponse({ ok: true, items: list });
      } else if (msg.type === "deleteItem") {
        await deleteItem(msg.tag, msg.index);
        sendResponse({ ok: true });
      } else if (msg.type === "deleteItemById") {
        const deleted = await deleteItemById(msg.url, msg.savedAt);
        sendResponse({ ok: true, deleted });
      } else if (msg.type === "deleteTag") {
        await deleteTag(msg.tag);
        sendResponse({ ok: true });
      } else if (msg.type === "restoreItem") {
        await restoreItem(msg.item);
        sendResponse({ ok: true });
      } else if (msg.type === "restoreAll") {
        await restoreAll(msg.tag);
        sendResponse({ ok: true });

      // Tag Settings
      } else if (msg.type === "getTagSettings") {
        const settings = await getTagSettings(msg.tag);
        sendResponse({ ok: true, settings });
      } else if (msg.type === "setTagSettings") {
        await setTagSettings(msg.tag, msg.settings);
        sendResponse({ ok: true });

      // Global Settings
      } else if (msg.type === "getGlobalSettings") {
        const settings = await getGlobalSettings();
        sendResponse({ ok: true, settings });
      } else if (msg.type === "setGlobalSettings") {
        await setGlobalSettings(msg.settings);
        sendResponse({ ok: true });

      // Classification
      } else if (msg.type === "classifyTab") {
        const matches = await classifier.classifyTab(msg.tab);
        sendResponse({ ok: true, matches });
      } else if (msg.type === "getSuggestedTag") {
        const suggestedTag = await classifier.getSuggestedTag(msg.tab);
        sendResponse({ ok: true, suggestedTag });
      } else if (msg.type === "getClassificationRules") {
        const rules = await classifier.getClassificationRules();
        sendResponse({ ok: true, rules });
      } else if (msg.type === "setClassificationRules") {
        await classifier.saveClassificationRules(msg.rules);
        sendResponse({ ok: true });
      } else if (msg.type === "addCustomRule") {
        const rules = await classifier.addCustomRule(msg.tagName, msg.urlPatterns, msg.titleKeywords);
        sendResponse({ ok: true, rules });
      } else if (msg.type === "resetClassificationRules") {
        const rules = await classifier.resetToDefaults();
        sendResponse({ ok: true, rules });

      // Hierarchical tag operations
      } else if (msg.type === "createTag") {
        const newTagPath = await createTag(msg.tagName);
        sendResponse({ ok: true, newTagPath });
      } else if (msg.type === "createSubTag") {
        const newTagPath = await createSubTag(msg.parentPath, msg.subTagName);
        sendResponse({ ok: true, newTagPath });
      } else if (msg.type === "moveTag") {
        const newPath = await moveTag(msg.fromPath, msg.toParentPath);
        sendResponse({ ok: true, newPath });
      } else if (msg.type === "toggleTagCollapse") {
        const collapsed = await toggleTagCollapse(msg.tagPath);
        sendResponse({ ok: true, collapsed });
      } else if (msg.type === "getTagsFlat") {
        const tags = await getTagsFlat();
        sendResponse({ ok: true, tags });
      } else if (msg.type === "syncTagConditions") {
        const result = await syncTagConditions(msg.tag);
        sendResponse({ ok: true, imported: result });

      } else {
        sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (e) {
      console.error(e);
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true; // keep channel open for async
});
