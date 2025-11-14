// TagTab functionality implementation for collective-design.html
let allSavedPages = [];
let allTags = [];
let currentFilter = 'All';

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

// Fetch tags using chrome runtime messaging
async function fetchTags() {
    try {
        const res = await chrome.runtime.sendMessage({ type: "getTags" });
        return res.ok ? res.tags : [];
    } catch (error) {
        console.error('Error fetching tags:', error);
        return [];
    }
}

// Fetch items for a specific tag
async function fetchItems(tagPath) {
    try {
        const res = await chrome.runtime.sendMessage({
            type: "getItems",
            tag: tagPath
        });
        return res.ok ? res.items : [];
    } catch (error) {
        console.error('Error fetching items for tag:', tagPath, error);
        return [];
    }
}

function getTagDisplayName(tagInfo) {
    if (typeof tagInfo === 'string') {
        return tagInfo;
    }
    const path = tagInfo.path;
    const segments = path.split('/');
    return segments[segments.length - 1];
}

function getTagPath(tagInfo) {
    return typeof tagInfo === 'string' ? tagInfo : tagInfo.path;
}

// Load and display TagTab data
async function loadTagTabData() {
    try {
        // Show loading message
        showMessage('Loading your tags...');
        console.log('🚀 Starting loadTagTabData...');

        // Fetch all tags
        allTags = await fetchTags();
        console.log('📦 Loaded tags:', allTags);
        console.log('📊 Tags count:', allTags.length);

        if (allTags.length === 0) {
            console.log('⚠️ No tags found, showing empty state');
            showMessage('No saved pages yet. Start saving tabs to see them here!');
            return;
        }

        // Load category buttons
        console.log('🔘 Loading category buttons...');
        await loadCategoryButtons();

        // Load all saved pages
        console.log('📄 Loading all saved pages...');
        await loadAllSavedPages();
        console.log('💾 All saved pages loaded:', allSavedPages);
        console.log('📈 Total pages count:', allSavedPages.length);

        // Display pages
        console.log('🎨 Displaying filtered pages...');
        displayFilteredPages();

    } catch (error) {
        console.error('💥 Error loading TagTab data:', error);
        showMessage('Error loading data. Make sure you\'re using this in the extension context.');
    }
}

async function loadCategoryButtons() {
    const categoryNav = document.querySelector('.category-nav');
    if (!categoryNav) return;

    // Clear existing content
    categoryNav.innerHTML = '';

    // Add "All" button
    const allBtn = document.createElement('a');
    allBtn.href = '#';
    allBtn.className = 'category-btn active';
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', (e) => {
        e.preventDefault();
        filterByTag('All');
    });
    categoryNav.appendChild(allBtn);

    // Add button for each tag
    allTags.forEach(tagInfo => {
        const tagPath = getTagPath(tagInfo);
        if (!tagPath.startsWith('📁') && !tagPath.startsWith('📂')) {
            const btn = document.createElement('a');
            btn.href = '#';
            btn.className = 'category-btn';
            btn.textContent = getTagDisplayName(tagInfo);
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                filterByTag(tagPath);
            });
            categoryNav.appendChild(btn);
        }
    });
}

async function loadAllSavedPages() {
    console.log('🔄 Starting loadAllSavedPages...');
    allSavedPages = [];

    // Fetch items from all tags
    for (const tagInfo of allTags) {
        const tagPath = getTagPath(tagInfo);
        console.log(`📂 Fetching items for tag: ${tagPath}`);
        const items = await fetchItems(tagPath);
        console.log(`📊 Items found for ${tagPath}:`, items.length, items);

        items.forEach(item => {
            item.sourceTag = tagPath;
            item.displayTag = getTagDisplayName(tagInfo);
        });
        allSavedPages = allSavedPages.concat(items);
        console.log(`📈 Total pages so far: ${allSavedPages.length}`);
    }

    console.log('🔗 All pages before deduplication:', allSavedPages);

    // Remove duplicates based on URL
    const uniquePages = [];
    const seenUrls = new Set();
    for (const page of allSavedPages) {
        if (!seenUrls.has(page.url)) {
            seenUrls.add(page.url);
            uniquePages.push(page);
        }
    }

    // Sort by most recent first
    allSavedPages = uniquePages.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    console.log('✅ Final deduplicated and sorted pages:', allSavedPages);
}

function filterByTag(tagFilter) {
    currentFilter = tagFilter;

    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === tagFilter || (tagFilter === 'All' && btn.textContent === 'All')) {
            btn.classList.add('active');
        }
    });

    // Display filtered pages
    displayFilteredPages();
}

function displayFilteredPages() {
    console.log('🎯 displayFilteredPages called');
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('❌ No .main-content element found');
        return;
    }
    console.log('✅ Found main content element');

    // Filter pages
    let filteredPages = allSavedPages;
    if (currentFilter !== 'All') {
        filteredPages = allSavedPages.filter(page => page.sourceTag === currentFilter);
        console.log(`🔍 Filtered to ${filteredPages.length} pages for tag: ${currentFilter}`);
    } else {
        console.log(`📄 Showing all ${filteredPages.length} pages`);
    }

    // Update item title to show count
    const itemTitle = document.querySelector('.item-title');
    if (itemTitle) {
        const count = filteredPages.length;
        const filterText = currentFilter === 'All' ? 'All Saved Pages' : currentFilter;
        itemTitle.textContent = `${filterText} (${count} page${count !== 1 ? 's' : ''})`;
        console.log(`📝 Updated title: ${itemTitle.textContent}`);
    }

    // Clear and update main content with actual pages
    console.log('🎨 Calling renderSavedPagesList with', filteredPages.length, 'pages');
    renderSavedPagesList(filteredPages, mainContent);
}

function renderSavedPagesList(pages, mainContent) {
    console.log('🖼️ renderSavedPagesList called with', pages.length, 'pages');

    // Clear existing content but keep the featured item
    const featuredItem = mainContent.querySelector('.featured-item');
    console.log('🎯 Featured item found:', !!featuredItem);

    // Clear main content
    mainContent.innerHTML = '';
    console.log('🧹 Cleared main content');

    // Re-add the featured item (our preview/summary card)
    if (featuredItem) {
        mainContent.appendChild(featuredItem);
        console.log('✅ Re-added featured item');
    }

    // Create pages container
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'saved-pages-container';
    console.log('📦 Created pages container');

    if (pages.length === 0) {
        console.log('⚠️ No pages to display, showing empty state');
        pagesContainer.innerHTML = `
            <div class="empty-state">
                <h3>No pages found</h3>
                <p>No saved pages match the current filter.</p>
            </div>
        `;
        mainContent.appendChild(pagesContainer);
        console.log('📋 Added empty state to main content');
        return;
    }

    // Group pages by date
    console.log('📅 Grouping pages by date...');
    const groupedPages = groupPagesByDate(pages);
    console.log('📊 Grouped pages:', groupedPages);

    // Create page items grouped by date
    Object.entries(groupedPages).forEach(([date, datePages]) => {
        console.log(`📆 Processing date group: ${date} with ${datePages.length} pages`);

        // Add date header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-group-header';
        dateHeader.textContent = date;
        pagesContainer.appendChild(dateHeader);
        console.log(`📌 Added date header: ${date}`);

        // Add pages for this date
        const pagesList = document.createElement('div');
        pagesList.className = 'pages-list';

        datePages.forEach((page, index) => {
            console.log(`🔗 Creating page item ${index + 1}:`, page.title);
            const pageItem = createPageItem(page);
            pagesList.appendChild(pageItem);
        });

        pagesContainer.appendChild(pagesList);
        console.log(`✅ Added ${datePages.length} pages for ${date}`);
    });

    mainContent.appendChild(pagesContainer);
    console.log('🎉 Added pages container to main content');
    console.log('📍 Final main content HTML:', mainContent.innerHTML.substring(0, 200) + '...');
}

function groupPagesByDate(pages) {
    const groups = {};

    pages.forEach(page => {
        const date = fmtDateOnly(page.savedAt) || 'Unknown Date';
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(page);
    });

    // Sort each group by time (newest first)
    Object.keys(groups).forEach(date => {
        groups[date].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    });

    return groups;
}

function createPageItem(page) {
    const item = document.createElement('div');
    item.className = 'page-item';

    // Format save time
    const saveTime = new Date(page.savedAt);
    const timeStr = saveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Truncate title if too long
    const title = page.title.length > 60 ? page.title.substring(0, 60) + '...' : page.title;

    // Extract domain from URL
    let domain = '';
    try {
        domain = new URL(page.url).hostname;
    } catch (e) {
        domain = page.url;
    }

    const defaultFavicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

    item.innerHTML = `
        <div class="page-item-icon">
            <img src="${page.favIconUrl || defaultFavicon}" alt="Favicon">
        </div>
        <div class="page-item-content">
            <div class="page-item-title">${title}</div>
            <div class="page-item-meta">
                <span class="page-item-domain">${domain}</span>
                <span class="page-item-tag">${page.displayTag}</span>
                <span class="page-item-time">${timeStr}</span>
            </div>
        </div>
        <div class="page-item-actions">
            <button class="page-action-btn open-btn" data-url="${page.url}">Open</button>
            <button class="page-action-btn delete-btn" data-url="${page.url}" data-tag="${page.sourceTag}">Delete</button>
        </div>
    `;

    // Add error handling for favicon
    const favicon = item.querySelector('.page-item-icon img');
    favicon.addEventListener('error', () => {
        favicon.src = defaultFavicon;
    });

    // Add click handler to open page
    const openBtn = item.querySelector('.open-btn');
    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: page.url });
    });

    // Add click handler for main item (also opens page)
    const content = item.querySelector('.page-item-content');
    content.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: page.url });
    });
    content.style.cursor = 'pointer';

    return item;
}

function updatePreviewImage(pages) {
    const previewImg = document.querySelector('.item-preview img');
    if (!previewImg || pages.length === 0) return;

    // Create SVG showing page cards
    const svgContent = generatePageCardsSVG(pages);
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
    previewImg.src = dataUrl;
}

function generatePageCardsSVG(pages) {
    const maxPages = Math.min(pages.length, 8);
    let svgContent = `<svg width='400' height='300' viewBox='0 0 400 300' xmlns='http://www.w3.org/2000/svg'>
        <rect width='400' height='300' fill='#101211'/>
        <g transform='translate(20, 20)'>`;

    for (let i = 0; i < maxPages; i++) {
        const page = pages[i];
        const y = i * 32;
        const cardColor = i % 3 === 0 ? '#E9EBEA' : i % 3 === 1 ? '#E8E5FF' : '#D4D0F0';
        const textColor = '#101211';

        // Truncate title if too long
        const title = page.title.length > 35 ? page.title.substring(0, 35) + '...' : page.title;

        svgContent += `
            <rect x='0' y='${y}' width='360' height='28' fill='${cardColor}' rx='14'/>
            <text x='15' y='${y + 18}' font-family='Inter, sans-serif' font-size='12' fill='${textColor}'>${title}</text>`;
    }

    if (pages.length > maxPages) {
        svgContent += `<text x='180' y='${maxPages * 32 + 20}' text-anchor='middle' font-family='Inter, sans-serif' font-size='11' fill='#888'>+${pages.length - maxPages} more pages</text>`;
    }

    svgContent += `</g></svg>`;
    return svgContent;
}

function searchPages(query) {
    if (!query.trim()) {
        displayFilteredPages();
        return;
    }

    const searchTerm = query.toLowerCase();
    const searchResults = allSavedPages.filter(page =>
        page.title.toLowerCase().includes(searchTerm) ||
        page.url.toLowerCase().includes(searchTerm) ||
        (page.displayTag && page.displayTag.toLowerCase().includes(searchTerm))
    );

    // Update item title to show search results count
    const itemTitle = document.querySelector('.item-title');
    if (itemTitle) {
        const count = searchResults.length;
        itemTitle.textContent = `Search: "${query}" (${count} result${count !== 1 ? 's' : ''})`;
    }

    // Display search results in main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        renderSavedPagesList(searchResults, mainContent);
    }

    // Also update preview image
    updatePreviewImage(searchResults.slice(0, 10));
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
        loadTagTabData();
    } else {
        showMessage('Open this page in your Chrome extension to see your saved tabs');
    }

    // Setup search and action buttons
    setupSearch();
    setupActionButtons();
});