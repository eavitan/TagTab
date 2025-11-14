// TagTab functionality implementation for collective-design.html
// Using exact same functions as master branch pages.js

let currentTag = null;

// Utility functions from pages.js
function fmtDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch { return ""; }
}

function fmtDateOnly(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString();
    } catch { return ""; }
}

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

// Fetch tags using chrome runtime messaging (exact same as master)
async function fetchTags() {
    const res = await chrome.runtime.sendMessage({ type: "getTags" });
    return res.ok ? res.tags : [];
}

// Fetch items for a specific tag (exact same as master)
async function fetchItems(tag) {
    const res = await chrome.runtime.sendMessage({ type: "getTagData", tag });
    return res.ok ? res.items : [];
}

function getTagDisplayName(tagInfo) {
    if (typeof tagInfo === 'string') {
        return tagInfo; // Backward compatibility
    }

    const path = tagInfo.path;
    const depth = tagInfo.depth || 0;

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

// Main render function adapted from master branch
async function render(tag) {
    const categoryNav = document.querySelector('.category-nav');
    const mainContent = document.querySelector('.main-content');

    if (!categoryNav || !mainContent) {
        console.error('Required elements not found');
        return;
    }

    categoryNav.innerHTML = "";
    const tags = await fetchTags();

    if (!tags.length) {
        showMessage('No saved pages yet. Start saving tabs to see them here!');
        mainContent.innerHTML = '<div class="empty-state"><h3>No saved pages yet</h3><p>Start saving tabs to see them here!</p></div>';
        return;
    }

    // Build tag navigation (category-nav)
    await loadCategoryButtons(tags, tag);

    // Set default tag if none selected
    if (!tag) tag = getTagPath(tags[0]);
    currentTag = tag;

    // Fetch and display items for selected tag
    const items = await fetchItems(tag);

    // Clear main content
    mainContent.innerHTML = '';

    // Re-add the featured item (our preview/summary card)
    const featuredItem = document.querySelector('.featured-item');
    if (featuredItem) {
        mainContent.appendChild(featuredItem.cloneNode(true));
    }

    // Create controls section
    const controls = createControls(tag);
    mainContent.appendChild(controls);

    if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = '<h3>No pages in this tag</h3><p>Start saving pages to see them here!</p>';
        mainContent.appendChild(empty);
        return;
    }

    // Create grouped list of items (exact same as master)
    const groupedItems = groupByDate(items);
    const container = document.createElement("div");
    container.className = "saved-pages-container";

    Object.entries(groupedItems).forEach(([dateKey, dateItems]) => {
        // Create date header
        const dateHeader = document.createElement("div");
        dateHeader.className = "date-group-header";
        dateHeader.textContent = dateKey;
        container.appendChild(dateHeader);

        // Create list for this date
        const list = document.createElement("div");
        list.className = "pages-list";

        dateItems.forEach((it, dateIdx) => {
            // Find the actual index in the original items array for proper deletion
            const actualIdx = items.findIndex(item =>
                item.url === it.url && item.savedAt === it.savedAt
            );

            const row = createPageItem(it, actualIdx, tag);
            list.appendChild(row);
        });

        container.appendChild(list);
    });

    mainContent.appendChild(container);

    // Update featured item title
    updateFeaturedItemTitle(tag, items.length);
}

async function loadCategoryButtons(tags, selectedTag) {
    const categoryNav = document.querySelector('.category-nav');
    if (!categoryNav) return;

    // Clear existing content
    categoryNav.innerHTML = '';

    // Add button for each tag (including special tags)
    tags.forEach(tagInfo => {
        const tagPath = getTagPath(tagInfo);
        const displayName = getTagDisplayName(tagInfo);

        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = 'category-btn';
        btn.textContent = displayName;

        // Mark as active if this is the selected tag
        if (tagPath === selectedTag) {
            btn.classList.add('active');
        }

        // Add special styling for special tags
        if (tagPath === "📁 All") {
            btn.setAttribute("data-special", "all");
        } else if (tagPath === "📂 Other") {
            btn.setAttribute("data-special", "other");
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            render(tagPath);
        });

        categoryNav.appendChild(btn);
    });
}

function createControls(tag) {
    const controls = document.createElement("div");
    controls.className = "controls";
    controls.style.justifyContent = "flex-end";

    const restoreAllBtn = document.createElement("button");
    restoreAllBtn.innerHTML = "🔄";
    restoreAllBtn.title = "Restore all";
    restoreAllBtn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: "restoreAll", tag });
    });

    const deleteTagBtn = document.createElement("button");
    deleteTagBtn.innerHTML = "🗑️";

    // Handle special tags differently (exact same as master)
    if (tag === "📁 All") {
        deleteTagBtn.title = "Clear all tags";
        deleteTagBtn.addEventListener('click', async () => {
            if (!confirm(`Delete all saved tabs from all tags? This cannot be undone!`)) return;
            // Clear all regular tags
            const allTags = await fetchTags();
            for (const t of allTags) {
                if (t !== "📁 All" && t !== "📂 Other") {
                    await chrome.runtime.sendMessage({ type: "deleteTag", tag: t });
                }
            }
            // Clear Other tag too
            await chrome.runtime.sendMessage({ type: "deleteTag", tag: "Other" });
            render(null);
        });
    } else if (tag === "📂 Other") {
        deleteTagBtn.title = "Clear Other";
        deleteTagBtn.addEventListener('click', async () => {
            if (!confirm(`Clear all unclassified tabs in "Other"?`)) return;
            await chrome.runtime.sendMessage({ type: "deleteTag", tag });
            render(null);
        });
    } else {
        deleteTagBtn.title = "Delete tag";
        deleteTagBtn.addEventListener('click', async () => {
            if (!confirm(`Delete all items in "${tag}"?`)) return;
            await chrome.runtime.sendMessage({ type: "deleteTag", tag });
            render(null);
        });
    }

    // Add sync conditions button for regular tags only
    let syncConditionsBtn = null;
    if (tag !== "📁 All" && tag !== "📂 Other") {
        syncConditionsBtn = document.createElement("button");
        syncConditionsBtn.innerHTML = "⚡";
        syncConditionsBtn.title = "Sync conditions";
        syncConditionsBtn.addEventListener('click', async () => {
            if (!confirm(`Sync conditions for "${tag}"? This will import matching pages from other tags based on the current classification rules.`)) return;
            const result = await chrome.runtime.sendMessage({ type: "syncTagConditions", tag });
            if (result.ok) {
                alert(`Synced ${result.imported} pages to "${tag}"`);
                render(tag); // Refresh the view
            } else {
                alert('Sync failed: ' + (result.error || 'Unknown error'));
            }
        });
    }

    if (syncConditionsBtn) {
        controls.append(restoreAllBtn, deleteTagBtn, syncConditionsBtn);
    } else {
        controls.append(restoreAllBtn, deleteTagBtn);
    }

    return controls;
}

function createPageItem(item, actualIdx, tag) {
    const row = document.createElement("div");
    row.className = "page-item";

    const icon = document.createElement("img");
    icon.src = item.favIconUrl || "icons/icon16.png";
    icon.alt = "Favicon";

    const info = document.createElement("div");
    info.className = "page-item-content";

    const title = document.createElement("div");
    title.className = "page-item-title";
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.textContent = item.title || item.url;
    title.appendChild(link);

    const meta = document.createElement("div");
    meta.className = "page-item-meta";

    // Show just time for items grouped by date
    const timeOnly = new Date(item.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let domain = '';
    try {
        domain = new URL(item.url).hostname;
    } catch (e) {
        domain = item.url;
    }

    meta.innerHTML = `
        <span class="page-item-domain">${domain}</span>
        <span class="page-item-time">${timeOnly}</span>
    `;

    // For "All" view, show the source tag
    if (tag === "📁 All" && item.sourceTag) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'page-item-tag';
        tagSpan.textContent = getTagDisplayName(item.sourceTag);
        meta.appendChild(tagSpan);
    }

    info.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "page-item-actions";

    const restoreBtn = document.createElement("button");
    restoreBtn.className = "page-action-btn open-btn";
    restoreBtn.textContent = "Restore";
    restoreBtn.addEventListener('click', () => {
        // Open in new tab
        window.open(item.url, '_blank');
        // Also send restore message for any cleanup/tracking
        chrome.runtime.sendMessage({ type: "restoreItem", item: item });
    });

    const delBtn = document.createElement("button");
    delBtn.className = "page-action-btn delete-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener('click', async () => {
        try {
            // For "All" view, use item identity to delete from wherever it exists
            if (tag === "📁 All") {
                await chrome.runtime.sendMessage({
                    type: "deleteItemById",
                    url: item.url,
                    savedAt: item.savedAt
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
    });

    actions.append(restoreBtn, delBtn);
    row.append(icon, info, actions);

    // Add click handler for main item (also opens page)
    info.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "restoreItem", item: item });
    });
    info.style.cursor = 'pointer';

    return row;
}

function updateFeaturedItemTitle(tag, itemCount) {
    const itemTitle = document.querySelector('.item-title');
    if (itemTitle) {
        const displayName = getTagDisplayName(tag);
        itemTitle.textContent = `${displayName} (${itemCount} page${itemCount !== 1 ? 's' : ''})`;
    }
}

function showMessage(message) {
    const categoryNav = document.querySelector('.category-nav');
    if (categoryNav) {
        categoryNav.innerHTML = `<div class="loading-message">${message}</div>`;
    }
}

function setupActionButtons() {
    // Update action buttons
    const openBtn = document.querySelector('.buy-btn');
    const settingsBtn = document.querySelector('.made-btn');

    if (openBtn) {
        openBtn.textContent = 'Open Pages Manager';
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'pages.html' });
        });
    }

    if (settingsBtn) {
        settingsBtn.textContent = '⚙️ Settings';
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'settings.html' });
        });
    }
}

function setupSearch() {
    // Add search functionality
    const searchForm = document.querySelector('.email-form');
    const searchInput = document.querySelector('.email-input');

    if (searchForm && searchInput) {
        // Change placeholder
        searchInput.placeholder = 'Search your saved pages';

        // Add search functionality
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = searchInput.value;
            searchPages(query);
        });

        // Real-time search
        searchInput.addEventListener('input', function() {
            const query = this.value;
            if (query.length > 2) {
                searchPages(query);
            } else if (query.length === 0) {
                displayFilteredPages();
            }
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're in extension context
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        render(null); // Start with no tag selected (will show first tag)
    } else {
        showMessage('Open this page in your Chrome extension to see your saved tabs');
    }

    // Setup search and action buttons
    setupSearch();
    setupActionButtons();
});