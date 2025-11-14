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
  // Create card-based layout
  content.innerHTML = "";

  // Filter out special tags for card view
  const regularTags = tags.filter(tagInfo => {
    const tagPath = getTagPath(tagInfo);
    return !tagPath.startsWith('📁') && !tagPath.startsWith('📂');
  });

  if (regularTags.length === 0) {
    content.innerHTML = '<div class="empty">No tags created yet. Start saving tabs to create your first tag!</div>';
    return;
  }

  for (const tagInfo of regularTags) {
    const tagPath = getTagPath(tagInfo);
    const displayName = getTagDisplayName(tagInfo);

    // Get item count for this tag
    const items = await fetchItems(tagPath);
    const itemCount = items.length;

    // Create tag card
    const card = document.createElement('div');
    card.className = 'tag-card';
    card.setAttribute('data-tag-path', tagPath);

    // Generate icon based on tag name
    const icon = getTagIcon(displayName);

    card.innerHTML = `
      <div class="tag-icon">${icon}</div>
      <div class="tag-content">
        <h3 class="tag-title">${displayName}</h3>
        <p class="tag-subtitle">${itemCount} saved ${itemCount === 1 ? 'page' : 'pages'}</p>
      </div>
      <div class="tag-arrow">→</div>
    `;

    // Add click handler
    card.addEventListener('click', () => {
      render(tagPath);
    });

    content.appendChild(card);
  }
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

  for (const tagInfo of tags) {
    const tagPath = getTagPath(tagInfo);
    const displayName = getTagDisplayName(tagInfo);
    const depth = typeof tagInfo === 'object' ? tagInfo.depth || 0 : 0;
    const hierarchy = typeof tagInfo === 'object' ? tagInfo.hierarchy : null;

    const btn = document.createElement("div");
    btn.className = "tab" + (tagPath === tag ? " active" : "");
    btn.style.marginLeft = `${depth * 20}px`; // Indent based on depth
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

  if (!tag) tag = getTagPath(tags[0]);

  const items = await fetchItems(tag);
  content.innerHTML = "";

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

  // Add sync conditions button for regular tags only
  let syncConditionsBtn = null;
  if (tag !== "📁 All" && tag !== "📂 Other") {
    syncConditionsBtn = document.createElement("button");
    syncConditionsBtn.textContent = "Sync conditions";
    syncConditionsBtn.onclick = async () => {
      if (!confirm(`Sync conditions for "${tag}"? This will import matching pages from other tags based on the current classification rules.`)) return;
      const result = await chrome.runtime.sendMessage({ type: "syncTagConditions", tag });
      if (result.ok) {
        alert(`Synced ${result.imported} pages to "${tag}"`);
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
      // Find the actual index in the original items array for proper deletion
      const actualIdx = items.findIndex(item =>
        item.url === it.url && item.savedAt === it.savedAt
      );

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
