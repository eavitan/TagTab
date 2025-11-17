# TagTab Functionality Technical Specification

## Overview
This document details the exact implementation of TagTab's core functionality as observed in the master branch, to be replicated in the new-design branch.

## 1. Tag Loading Mechanism

### Core Functions
```javascript
// Main data fetching functions
async function fetchTags() {
  const res = await chrome.runtime.sendMessage({ type: "getTags" });
  return res.ok ? res.tags : [];
}

async function fetchItems(tag) {
  const res = await chrome.runtime.sendMessage({ type: "getTagData", tag });
  return res.ok ? res.items : [];
}
```

### Tag Processing
```javascript
function getTagDisplayName(tagInfo) {
  if (typeof tagInfo === 'string') {
    return tagInfo; // Backward compatibility
  }

  const path = tagInfo.path;

  // For special tags, return as-is
  if (path.startsWith('📁') || path.startsWith('📂')) {
    return path;
  }

  // Extract just the tag name for display
  const lastSlash = path.lastIndexOf('/');
  const tagName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;

  return tagName;
}

function getTagPath(tagInfo) {
  return typeof tagInfo === 'string' ? tagInfo : tagInfo.path;
}
```

### Tag Rendering
- Tags are rendered into `#tabbar` element
- Each tag becomes a `.tab` element with classes:
  - `.tab` - base class
  - `.active` - when selected
  - `data-special="all"` for "📁 All" tag
  - `data-special="other"` for "📂 Other" tag
- Hierarchical tags have:
  - `data-depth` attribute
  - `marginLeft` styling for indentation
  - Tree toggle buttons (`▶`/`▼`) for expand/collapse

## 2. Page Loading and Display Structure

### Main Render Flow
```javascript
async function render(tag) {
  // 1. Clear and rebuild tag bar
  tabbar.innerHTML = "";
  const tags = await fetchTags();

  // 2. Handle empty state
  if (!tags.length) {
    content.innerHTML = '<div class="empty">No saved pages yet.</div>';
    return;
  }

  // 3. Build tag buttons with hierarchy support
  for (const tagInfo of tags) {
    // Create tag button with proper indentation and tree controls
  }

  // 4. Set default tag if none selected
  if (!tag) tag = getTagPath(tags[0]);

  // 5. Fetch and display items for selected tag
  const items = await fetchItems(tag);
  content.innerHTML = "";

  // 6. Create controls section
  // 7. Create grouped list of items
}
```

### Date Grouping Function
```javascript
function groupByDate(items) {
  const groups = {};

  items.forEach(item => {
    const dateKey = fmtDateOnly(item.savedAt) || 'Unknown Date';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });

  // Sort each group by time (newest first within each date)
  Object.keys(groups).forEach(dateKey => {
    groups[dateKey].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  });

  // Sort date groups by date (newest first)
  const sortedGroups = {};
  Object.keys(groups)
    .sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return new Date(b) - new Date(a);
    })
    .forEach(key => {
      sortedGroups[key] = groups[key];
    });

  return sortedGroups;
}
```

### Grouped List Structure
```html
<div class="grouped-list">
  <div class="date-header">Date String</div>
  <div class="list">
    <div class="item">
      <img src="favicon" />
      <div class="grow">
        <div class="title">
          <a href="url" target="_blank">Page Title</a>
        </div>
        <div class="muted">URL • Time • [Source Tag for "All" view]</div>
      </div>
      <button>Restore</button>
      <button>Delete</button>
    </div>
    <!-- More items... -->
  </div>
  <!-- More date groups... -->
</div>
```

## 3. Controls Functionality

### Controls Structure
```javascript
const controls = document.createElement("div");
controls.className = "controls";

// Always present buttons
const restoreAllBtn = document.createElement("button");
restoreAllBtn.textContent = "Restore all";
restoreAllBtn.onclick = async () => chrome.runtime.sendMessage({ type: "restoreAll", tag });

const deleteTagBtn = document.createElement("button");
// Text and behavior varies by tag type (see below)

// Conditional button for regular tags only
let syncConditionsBtn = null;
if (tag !== "📁 All" && tag !== "📂 Other") {
  syncConditionsBtn = document.createElement("button");
  syncConditionsBtn.textContent = "Sync conditions";
  // Implementation below
}
```

### Special Tag Handling
```javascript
if (tag === "📁 All") {
  deleteTagBtn.textContent = "Clear all tags";
  deleteTagBtn.onclick = async () => {
    if (!confirm(`Delete all saved tabs from all tags? This cannot be undone!`)) return;
    const allTags = await fetchTags();
    for (const t of allTags) {
      if (t !== "📁 All" && t !== "📂 Other") {
        await chrome.runtime.sendMessage({ type: "deleteTag", tag: t });
      }
    }
    await chrome.runtime.sendMessage({ type: "deleteTag", tag: "Other" });
    render(null);
  };
} else if (tag === "📂 Other") {
  deleteTagBtn.textContent = "Clear Other";
  deleteTagBtn.onclick = async () => {
    if (!confirm(`Clear all unclassified tabs in "Other"?`)) return;
    await chrome.runtime.sendMessage({ type: "deleteTag", tag });
    render(null);
  };
} else {
  deleteTagBtn.textContent = "Delete tag";
  deleteTagBtn.onclick = async () => {
    if (!confirm(`Delete all items in "${tag}"?`)) return;
    await chrome.runtime.sendMessage({ type: "deleteTag", tag });
    render(null);
  };
}
```

### Sync Conditions Feature
```javascript
if (tag !== "📁 All" && tag !== "📂 Other") {
  syncConditionsBtn = document.createElement("button");
  syncConditionsBtn.textContent = "Sync conditions";
  syncConditionsBtn.onclick = async () => {
    if (!confirm(`Sync conditions for "${tag}"? This will import matching pages from other tags based on the current classification rules.`)) return;
    const result = await chrome.runtime.sendMessage({ type: "syncTagConditions", tag });
    if (result.ok) {
      alert(`Synced ${result.imported} pages to "${tag}"`);
      render(tag);
    } else {
      alert('Sync failed: ' + (result.error || 'Unknown error'));
    }
  };
}
```

## 4. Item Actions

### Restore Button
```javascript
const restoreBtn = document.createElement("button");
restoreBtn.textContent = "Restore";
restoreBtn.onclick = () => chrome.runtime.sendMessage({ type: "restoreItem", item: it });
```

### Delete Button
```javascript
const delBtn = document.createElement("button");
delBtn.textContent = "Delete";
delBtn.onclick = async () => {
  try {
    if (tag === "📁 All") {
      // For "All" view, use item identity to delete from wherever it exists
      await chrome.runtime.sendMessage({
        type: "deleteItemById",
        url: it.url,
        savedAt: it.savedAt
      });
    } else {
      // Regular delete for specific tag views
      await chrome.runtime.sendMessage({
        type: "deleteItem",
        tag,
        index: actualIdx
      });
    }
    render(tag); // Refresh the view
  } catch (error) {
    console.error('Error deleting item:', error);
  }
};
```

## 5. Chrome Runtime Messages

### Required Message Types
- `{ type: "getTags" }` - Returns `{ ok: boolean, tags: Array }`
- `{ type: "getTagData", tag: string }` - Returns `{ ok: boolean, items: Array }`
- `{ type: "restoreAll", tag: string }` - Restore all items in tag
- `{ type: "restoreItem", item: Object }` - Restore single item
- `{ type: "deleteTag", tag: string }` - Delete entire tag
- `{ type: "deleteItem", tag: string, index: number }` - Delete item by index
- `{ type: "deleteItemById", url: string, savedAt: string }` - Delete item by identity
- `{ type: "syncTagConditions", tag: string }` - Returns `{ ok: boolean, imported: number }`

## 6. Data Structures

### Tag Object
```javascript
{
  path: "string", // Full tag path (e.g., "Development/Frontend")
  depth: number,  // Hierarchy depth (0, 1, 2, etc.)
  hierarchy: {    // For parent tags
    children: Array,
    collapsed: boolean
  }
}
```

### Item Object
```javascript
{
  url: "string",
  title: "string",
  favIconUrl: "string",
  savedAt: "ISO date string",
  sourceTag: "string" // Added for "All" view display
}
```

## 7. CSS Classes Required

### Core Structure
- `.wrap` - Main container
- `#tabbar` - Tag navigation bar
- `#content` - Main content area
- `.controls` - Control buttons container
- `.grouped-list` - Container for date-grouped items
- `.date-header` - Date group headers
- `.list` - Container for items within a date group
- `.item` - Individual page item
- `.grow` - Flexible content area in item
- `.title` - Page title container
- `.muted` - Secondary text (URL, time, etc.)
- `.empty` - Empty state message

### Tag Styling
- `.tab` - Tag button base style
- `.tab.active` - Selected tag
- `.tab[data-special="all"]` - "All" tag special styling
- `.tab[data-special="other"]` - "Other" tag special styling
- `.tab[data-depth]` - Hierarchical tags with indentation

## 8. Implementation Priority

1. **Core Data Flow**: Implement fetchTags() and fetchItems() with proper chrome.runtime messaging
2. **Tag Rendering**: Create tag buttons with proper hierarchy and selection
3. **Item Display**: Implement grouped-list with date headers and item structure
4. **Controls**: Add restore/delete functionality with special tag handling
5. **Actions**: Implement individual item restore/delete with proper message types
6. **Styling**: Apply all required CSS classes and responsive behavior

## 9. Key Differences from Current Implementation

The new-design branch needs to:
- Use chrome.runtime.sendMessage instead of direct storage access
- Implement proper date grouping with sticky headers
- Handle special tags ("📁 All", "📂 Other") correctly
- Support hierarchical tag structure with depth and tree controls
- Include sync conditions functionality for regular tags
- Proper item deletion handling for both individual tags and "All" view