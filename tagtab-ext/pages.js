const $ = s => document.querySelector(s);
const tabbar = $("#tabbar");
const content = $("#content");

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

async function fetchTags() {
  const res = await chrome.runtime.sendMessage({ type: "getTags" });
  return res.ok ? res.tags : [];
}

async function fetchTagsFlat() {
  const res = await chrome.runtime.sendMessage({ type: "getTagsFlat" });
  return res.ok ? res.tags : [];
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

async function fetchItems(tag) {
  const res = await chrome.runtime.sendMessage({ type: "getTagData", tag });
  return res.ok ? res.items : [];
}

async function render(tag) {
  tabbar.innerHTML = "";
  const tags = await fetchTags();

  // Remove detail view class first
  document.body.classList.remove('tag-detail-view');

  if (!tags.length) {
    content.innerHTML = '<div class="empty">No saved pages yet.</div>';
    return;
  }

  // Show card view if no tag is selected
  if (!tag) {
    await renderCardView(tags);
    return;
  }

  // Show detail view for selected tag
  document.body.classList.add('tag-detail-view');
  await renderDetailView(tag, tags);
}

async function renderCardView(tags) {
  // Create card-based layout showing all saved pages
  content.innerHTML = "";

  // Add tag navigation bar
  const tagNavigation = document.createElement('div');
  tagNavigation.className = 'tag-navigation';
  tagNavigation.innerHTML = '<h2>All Saved Pages</h2>';
  content.appendChild(tagNavigation);

  // Add tag filter buttons
  const tagFilters = document.createElement('div');
  tagFilters.className = 'tag-filters';

  // Add "All" filter
  const allFilter = document.createElement('button');
  allFilter.textContent = 'All';
  allFilter.className = 'filter-btn active';
  allFilter.onclick = () => filterCardsByTag(null, tags);
  tagFilters.appendChild(allFilter);

  // Add filter for each tag
  tags.forEach(tagInfo => {
    const tagPath = getTagPath(tagInfo);
    if (!tagPath.startsWith('📁') && !tagPath.startsWith('📂')) {
      const filterBtn = document.createElement('button');
      filterBtn.textContent = getTagDisplayName(tagInfo);
      filterBtn.className = 'filter-btn';
      filterBtn.onclick = () => filterCardsByTag(tagPath, tags);
      tagFilters.appendChild(filterBtn);
    }
  });

  content.appendChild(tagFilters);

  // Get all items from all tags
  let allItems = [];
  for (const tagInfo of tags) {
    const tagPath = getTagPath(tagInfo);
    const items = await fetchItems(tagPath);
    items.forEach(item => {
      item.sourceTag = tagPath; // Add source tag info
    });
    allItems = allItems.concat(items);
  }

  if (allItems.length === 0) {
    content.innerHTML += '<div class="empty">No saved pages yet. Start saving tabs to see them here!</div>';
    return;
  }

  // Remove duplicates based on URL
  const uniqueItems = [];
  const seenUrls = new Set();
  for (const item of allItems) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      uniqueItems.push(item);
    }
  }

  // Sort by most recent first
  uniqueItems.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  // Create container for cards
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'cards-container';
  cardsContainer.id = 'cards-container';

  // Store all items globally for filtering
  window.allCardItems = uniqueItems;

  // Create page cards
  displayCards(uniqueItems);

  content.appendChild(cardsContainer);
}

function displayCards(items) {
  const cardsContainer = document.getElementById('cards-container');
  if (!cardsContainer) return;

  cardsContainer.innerHTML = '';

  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'tag-card';
    card.setAttribute('data-url', item.url);
    card.setAttribute('data-tag', item.sourceTag);

    // Generate icon based on page favicon or domain
    const icon = getPageIcon(item);

    card.innerHTML = `
      <div class="tag-icon">${icon}</div>
      <div class="tag-content">
        <h3 class="tag-title">${item.title || item.url}</h3>
        <p class="tag-subtitle">${new URL(item.url).hostname} • ${getTagDisplayName(item.sourceTag)}</p>
      </div>
      <div class="tag-arrow">→</div>
    `;

    // Add click handler to open the page
    card.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: "restoreItem", item: item });
    });

    // Add right-click context menu
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showCardContextMenu(e, item);
    });

    cardsContainer.appendChild(card);
  }
}

function filterCardsByTag(selectedTag, tags) {
  // Update filter button states
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  if (selectedTag === null) {
    // Show all items
    document.querySelector('.filter-btn').classList.add('active');
    displayCards(window.allCardItems || []);
  } else {
    // Show items from specific tag
    event.target.classList.add('active');
    const filteredItems = (window.allCardItems || []).filter(item => item.sourceTag === selectedTag);
    displayCards(filteredItems);
  }
}

function showCardContextMenu(event, item) {
  // Remove any existing context menu
  const existingMenu = document.querySelector('.card-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  // Create context menu
  const menu = document.createElement('div');
  menu.className = 'card-context-menu';
  menu.style.left = event.pageX + 'px';
  menu.style.top = event.pageY + 'px';

  // Add menu items
  const openBtn = document.createElement('button');
  openBtn.textContent = 'Open Page';
  openBtn.onclick = () => {
    chrome.runtime.sendMessage({ type: "restoreItem", item: item });
    menu.remove();
  };

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy URL';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(item.url);
    menu.remove();
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: "deleteItemById",
        url: item.url,
        savedAt: item.savedAt
      });
      // Refresh the card view
      render(null);
      menu.remove();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  menu.appendChild(openBtn);
  menu.appendChild(copyBtn);
  menu.appendChild(deleteBtn);

  document.body.appendChild(menu);

  // Close menu when clicking outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

function getPageIcon(item) {
  // Try to extract domain-based icon or use favicon
  const hostname = new URL(item.url).hostname.toLowerCase();

  if (hostname.includes('github')) return '🐙';
  if (hostname.includes('stackoverflow')) return '📊';
  if (hostname.includes('youtube')) return '🎬';
  if (hostname.includes('twitter') || hostname.includes('x.com')) return '🐦';
  if (hostname.includes('linkedin')) return '💼';
  if (hostname.includes('facebook')) return '📘';
  if (hostname.includes('instagram')) return '📷';
  if (hostname.includes('reddit')) return '🤖';
  if (hostname.includes('medium')) return '✍️';
  if (hostname.includes('gmail') || hostname.includes('mail')) return '✉️';
  if (hostname.includes('docs.google') || hostname.includes('drive.google')) return '📄';
  if (hostname.includes('figma')) return '🎨';
  if (hostname.includes('notion')) return '📝';
  if (hostname.includes('slack')) return '💬';
  if (hostname.includes('discord')) return '🎮';
  if (hostname.includes('spotify')) return '🎵';
  if (hostname.includes('netflix')) return '🎬';
  if (hostname.includes('amazon')) return '🛒';
  if (hostname.includes('wikipedia')) return '📚';

  // Fallback to generic web icon
  return '🌐';
}

function getTagIcon(tagName) {
  // Generate icons based on tag name or use defaults
  const name = tagName.toLowerCase();

  if (name.includes('dev') || name.includes('code') || name.includes('program')) {
    return '💻';
  } else if (name.includes('design') || name.includes('art') || name.includes('creative')) {
    return '🎨';
  } else if (name.includes('business') || name.includes('work') || name.includes('office')) {
    return '💼';
  } else if (name.includes('learn') || name.includes('edu') || name.includes('study')) {
    return '📚';
  } else if (name.includes('news') || name.includes('article') || name.includes('blog')) {
    return '📰';
  } else if (name.includes('social') || name.includes('community')) {
    return '👥';
  } else if (name.includes('shop') || name.includes('buy') || name.includes('purchase')) {
    return '🛍️';
  } else if (name.includes('entertainment') || name.includes('fun') || name.includes('game')) {
    return '🎮';
  } else if (name.includes('music') || name.includes('audio')) {
    return '🎵';
  } else if (name.includes('video') || name.includes('movie') || name.includes('film')) {
    return '🎬';
  } else if (name.includes('food') || name.includes('recipe') || name.includes('cook')) {
    return '🍳';
  } else if (name.includes('travel') || name.includes('trip') || name.includes('vacation')) {
    return '✈️';
  } else if (name.includes('health') || name.includes('fitness') || name.includes('medical')) {
    return '🏥';
  } else {
    return '📂';
  }
}

async function renderDetailView(tag, tags) {
  // Clear content and add back button
  content.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.innerHTML = '← Back to Tags';
  backBtn.onclick = () => render(null);
  content.appendChild(backBtn);

  // Build tabbar for tag navigation
  for (const tagInfo of tags) {
    const tagPath = getTagPath(tagInfo);
    const displayName = getTagDisplayName(tagInfo);
    const depth = typeof tagInfo === 'object' ? tagInfo.depth || 0 : 0;
    const hierarchy = typeof tagInfo === 'object' ? tagInfo.hierarchy : null;

    const btn = document.createElement("div");
    btn.className = "tab" + (tagPath === tag ? " active" : "");
    btn.style.marginLeft = `${depth * 20}px`;
    btn.setAttribute("data-tag-path", tagPath);
    btn.setAttribute("data-depth", depth);

    // Build the display content
    let buttonContent = "";

    // Add collapse/expand icon for parent tags
    if (hierarchy && hierarchy.children.length > 0) {
      const isCollapsed = hierarchy.collapsed;
      buttonContent += `<span class="tree-toggle" data-tag="${tagPath}">${isCollapsed ? '▶' : '▼'}</span> `;
    } else if (depth > 0) {
      // Add tree lines for child tags
      buttonContent += '<span class="tree-line">├─</span> ';
    }

    buttonContent += displayName;

    btn.innerHTML = buttonContent;

    // Add special styling attributes
    if (tagPath === "📁 All") {
      btn.setAttribute("data-special", "all");
    } else if (tagPath === "📂 Other") {
      btn.setAttribute("data-special", "other");
    }

    // Click handler for the main tag
    btn.addEventListener("click", async (e) => {
      if (!e.target.classList.contains('tree-toggle')) {
        // If this is a parent tag, auto-expand it when selected
        if (hierarchy && hierarchy.children.length > 0 && hierarchy.collapsed) {
          await chrome.runtime.sendMessage({
            type: "toggleTagCollapse",
            tagPath: tagPath
          });
          // Re-render to show expanded children, then render content
          await render(tagPath);
        } else {
          render(tagPath);
        }
      }
    });

    tabbar.appendChild(btn);
  }

  // Add event listeners for collapse/expand toggles
  tabbar.querySelectorAll('.tree-toggle').forEach(toggle => {
    toggle.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tagPath = e.target.getAttribute('data-tag');
      await chrome.runtime.sendMessage({
        type: "toggleTagCollapse",
        tagPath: tagPath
      });
      render(tag); // Refresh the view
    });
  });

  // Now show the items for the selected tag
  const items = await fetchItems(tag);

  const controls = document.createElement("div");
  controls.className = "controls";
  const restoreAllBtn = document.createElement("button");
  restoreAllBtn.textContent = "Restore all";
  restoreAllBtn.onclick = async () => chrome.runtime.sendMessage({ type: "restoreAll", tag });

  const deleteTagBtn = document.createElement("button");

  // Handle special tags differently
  if (tag === "📁 All") {
    deleteTagBtn.textContent = "Clear all tags";
    deleteTagBtn.onclick = async () => {
      const confirmed = confirm('This will delete ALL saved pages from ALL tags. Are you sure?');
      if (confirmed) {
        await chrome.runtime.sendMessage({ type: "clearAllTags" });
        render(null); // Return to home
      }
    };
  } else if (tag === "📂 Other") {
    deleteTagBtn.textContent = "Clear untagged";
    deleteTagBtn.onclick = async () => {
      const confirmed = confirm('This will delete all untagged pages. Are you sure?');
      if (confirmed) {
        await chrome.runtime.sendMessage({ type: "deleteTag", tag });
        render(null); // Return to home
      }
    };
  } else {
    deleteTagBtn.textContent = "Delete tag";
    deleteTagBtn.onclick = async () => {
      const confirmed = confirm(`Delete the tag "${tag}" and all its pages?`);
      if (confirmed) {
        await chrome.runtime.sendMessage({ type: "deleteTag", tag });
        render(null); // Return to home
      }
    };
  }

  // Add sync conditions button for regular tags (not special ones)
  let syncConditionsBtn = null;
  if (!tag.startsWith('📁') && !tag.startsWith('📂')) {
    syncConditionsBtn = document.createElement("button");
    syncConditionsBtn.textContent = "Sync conditions";
    syncConditionsBtn.title = "Import pages from other tags based on classification rules";
    syncConditionsBtn.onclick = async () => {
      const result = await chrome.runtime.sendMessage({
        type: "syncTagConditions",
        tag
      });
      if (result && result.success) {
        alert(`Imported ${result.count} pages based on classification rules`);
        render(tag); // Refresh the view
      } else {
        alert('Sync failed: ' + (result.error || 'Unknown error'));
      }
    };
  }

  if (syncConditionsBtn) {
    controls.append(restoreAllBtn, deleteTagBtn, syncConditionsBtn);
  } else {
    controls.append(restoreAllBtn, deleteTagBtn);
  }
  content.appendChild(controls);

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No pages in this tag.";
    content.appendChild(empty);
    return;
  }

  // Group items by date
  const groupedItems = groupByDate(items);

  const container = document.createElement("div");
  container.className = "grouped-list";

  Object.entries(groupedItems).forEach(([dateKey, dateItems]) => {
    // Create date header
    const dateHeader = document.createElement("div");
    dateHeader.className = "date-header";
    dateHeader.textContent = dateKey;
    container.appendChild(dateHeader);

    // Create list for this date
    const list = document.createElement("div");
    list.className = "list";

    dateItems.forEach((it, dateIdx) => {
      const row = document.createElement("div");
      row.className = "item";
      const icon = document.createElement("img");
      icon.src = it.favIconUrl || "icons/icon16.png";
      const info = document.createElement("div");
      info.className = "grow";
      const title = document.createElement("div");
      title.className = "title";
      const link = document.createElement("a");
      link.href = it.url;
      link.target = "_blank";
      link.textContent = it.title || it.url;
      title.appendChild(link);
      const meta = document.createElement("div");
      meta.className = "muted";

      // Show just time for items grouped by date
      const timeOnly = new Date(it.savedAt).toLocaleTimeString();
      let metaText = it.url + "  •  " + timeOnly;

      // For "All" view, show the source tag
      if (tag === "📁 All" && it.sourceTag) {
        metaText += "  •  " + it.sourceTag;
      }

      meta.textContent = metaText;
      info.append(title, meta);

      const restoreBtn = document.createElement("button");
      restoreBtn.textContent = "Restore";
      restoreBtn.onclick = () => chrome.runtime.sendMessage({ type: "restoreItem", item: it });

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.onclick = async () => {
        try {
          // For "All" view, use item identity to delete from wherever it exists
          if (tag === "📁 All") {
            await chrome.runtime.sendMessage({
              type: "deleteItemById",
              url: it.url,
              savedAt: it.savedAt
            });
          } else {
            // Find the actual index in the original items array for proper deletion
            const actualIdx = items.findIndex(item =>
              item.url === it.url && item.savedAt === it.savedAt
            );
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

      row.append(icon, info, restoreBtn, delBtn);
      list.appendChild(row);
    });

    container.appendChild(list);
  });

  content.appendChild(container);
}

render(null);