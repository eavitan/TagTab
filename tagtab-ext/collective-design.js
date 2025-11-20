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
    restoreAllBtn.innerHTML = "Restore all";
    restoreAllBtn.title = "Restore all";
    restoreAllBtn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: "restoreAll", tag });
    });

    const deleteTagBtn = document.createElement("button");
    deleteTagBtn.innerHTML = "Clear all tags";

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
        syncConditionsBtn.innerHTML = "Sync conditions";
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

    // Create main row container
    const pageItemRow = document.createElement("div");
    pageItemRow.className = "page-item-row";

    // Create icon container (minimalist design)
    const iconContainer = document.createElement("div");
    iconContainer.className = "page-item-icon";

    const icon = document.createElement("img");
    icon.src = item.favIconUrl || "icons/icon16.png";
    icon.alt = "Favicon";
    iconContainer.appendChild(icon);

    const info = document.createElement("div");
    info.className = "page-item-content";

    const title = document.createElement("div");
    title.className = "page-item-title";
    title.textContent = item.customTitle || item.title || item.url;

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
    restoreBtn.innerHTML = "🔄";
    restoreBtn.title = "Restore";
    restoreBtn.addEventListener('click', () => {
        // Open in new tab
        window.open(item.url, '_blank');
        // Also send restore message for any cleanup/tracking
        chrome.runtime.sendMessage({ type: "restoreItem", item: item });
    });

    const settingsBtn = document.createElement("button");
    settingsBtn.className = "page-action-btn settings-btn";
    settingsBtn.innerHTML = "⚙️";
    settingsBtn.title = "Settings";
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleItemSettings(row, item, tag);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "page-action-btn delete-btn";
    delBtn.innerHTML = "🗑️";
    delBtn.title = "Delete";
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

    actions.append(restoreBtn, settingsBtn, delBtn);

    // Assemble the row structure
    pageItemRow.append(iconContainer, info, actions);
    row.appendChild(pageItemRow);

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

function toggleItemSettings(row, item, tag) {
    const existingPanel = row.querySelector('.item-settings-panel');

    if (existingPanel) {
        // Toggle existing panel
        existingPanel.classList.toggle('active');
        return;
    }

    // Create a safe ID by replacing invalid characters
    const safeId = item.savedAt.replace(/[^a-zA-Z0-9-_]/g, '_');

    // Get domain for delete domain feature
    let domain = '';
    try {
        domain = new URL(item.url).hostname;
    } catch (e) {
        domain = item.url;
    }

    // Check if we should show delete domain button
    const showDeleteDomain = tag !== "📁 All" && tag !== "📂 Other";

    // Create new settings panel
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'item-settings-panel active';
    settingsPanel.innerHTML = `
        <div class="settings-grid">
            <div class="settings-group full-width">
                <label for="itemSettings-regex-${safeId}">URL Pattern Rule</label>
                <input type="text" id="itemSettings-regex-${safeId}" placeholder="Enter URL pattern">
                <div class="regex-help">Create automatic classification rule for similar URLs. Use * as wildcard (e.g., *github.com* matches any GitHub URL)</div>
                <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
                    <select id="itemSettings-tagSelect-${safeId}" style="flex: 1; padding: 6px 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: #E9EBEA; font-size: 12px;">
                        <option value="">Loading tags...</option>
                    </select>
                    <button class="settings-btn primary" data-action="saveRegex" style="font-size: 12px; padding: 6px 12px;">Save to Tag</button>
                </div>
            </div>
        </div>
        <div class="settings-actions">
            <button class="settings-btn danger" data-action="deleteDomain" ${!showDeleteDomain ? 'disabled' : ''}>
                Delete
            </button>
            <button class="settings-btn secondary" data-action="cancel">Close</button>
        </div>
    `;

    // Load existing settings if any
    loadItemSettings(item, settingsPanel, safeId);

    // Populate tag dropdown
    populateTagDropdown(settingsPanel, safeId, tag);

    // Add event listeners for buttons
    settingsPanel.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        settingsPanel.classList.remove('active');
    });

    // Add save regex functionality
    settingsPanel.querySelector('[data-action="saveRegex"]').addEventListener('click', async () => {
        const regexPattern = settingsPanel.querySelector(`#itemSettings-regex-${safeId}`).value.trim();
        const selectedTag = settingsPanel.querySelector(`#itemSettings-tagSelect-${safeId}`).value;

        if (!regexPattern) {
            alert('Please enter a URL pattern');
            return;
        }

        if (!selectedTag) {
            alert('Please select a tag');
            return;
        }

        try {
            const regexResult = await chrome.runtime.sendMessage({
                type: "addCustomRule",
                tagName: selectedTag,
                urlPatterns: [regexPattern],
                titleKeywords: []
            });

            if (regexResult.ok) {
                alert(`URL pattern rule added to "${selectedTag}"!`);
                settingsPanel.classList.remove('active');
            } else {
                alert('Failed to add URL pattern rule: ' + (regexResult.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving regex rule:', error);
            alert('Error saving URL pattern rule');
        }
    });

    // Pre-fill URL pattern with the full saved URL
    const regexInput = settingsPanel.querySelector(`#itemSettings-regex-${safeId}`);
    if (!regexInput.value) {
        regexInput.value = item.url;
    }

    // Add delete domain functionality
    const deleteDomainBtn = settingsPanel.querySelector('[data-action="deleteDomain"]');
    if (deleteDomainBtn && !deleteDomainBtn.disabled) {
        deleteDomainBtn.addEventListener('click', async () => {
            if (confirm(`Delete all pages from domain "${domain}" in tag "${tag}"? This action cannot be undone.`)) {
                try {
                    const result = await chrome.runtime.sendMessage({
                        type: "deleteDomainFromTag",
                        tag: tag,
                        domain: domain
                    });

                    if (result.ok) {
                        settingsPanel.classList.remove('active');
                        render(currentTag); // Refresh the view
                        alert(`Deleted ${result.count || 0} pages from domain "${domain}"`);
                    } else {
                        alert('Failed to delete domain: ' + (result.error || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('Error deleting domain:', error);
                    alert('Error deleting domain from tag');
                }
            }
        });
    }

    row.appendChild(settingsPanel);
}

async function populateTagDropdown(panel, safeId, currentTag) {
    try {
        const allTags = await fetchTags();
        const tagSelect = panel.querySelector(`#itemSettings-tagSelect-${safeId}`);

        // Clear loading option
        tagSelect.innerHTML = '';

        // Add tags to dropdown, excluding special tags
        allTags.forEach(tagName => {
            if (tagName !== "📁 All" && tagName !== "📂 Other") {
                const option = document.createElement('option');
                option.value = tagName;
                option.textContent = tagName;

                // Set current tag as selected
                if (tagName === currentTag) {
                    option.selected = true;
                }

                tagSelect.appendChild(option);
            }
        });

        // If no tags available or current tag is special, add a default option
        if (tagSelect.children.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No tags available';
            tagSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading tags for dropdown:', error);
        const tagSelect = panel.querySelector(`#itemSettings-tagSelect-${safeId}`);
        tagSelect.innerHTML = '<option value="">Error loading tags</option>';
    }
}

async function loadItemSettings(item, panel, safeId) {
    try {
        const result = await chrome.runtime.sendMessage({
            type: "getItemSettings",
            url: item.url,
            savedAt: item.savedAt
        });

        // No settings to load for this simplified panel
    } catch (error) {
        console.error('Error loading item settings:', error);
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
            chrome.tabs.create({ url: 'collective-design.html' });
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