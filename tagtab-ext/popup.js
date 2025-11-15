const $ = sel => document.querySelector(sel);
const tagsEl = $("#tags");
const toast = $("#toast");

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => toast.hidden = true, 1600);
}

function getTagPath(tagInfo) {
  return typeof tagInfo === 'string' ? tagInfo : tagInfo.path;
}

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

// Global variables for regex dialog
let currentTab = null;
let currentTagForRegex = null;

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function generateUrlPatterns(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const pathname = urlObj.pathname;

    const patterns = [
      `*${domain}*`,
      `https://${domain}/*`,
      `*://${domain}/*`,
      url.substring(0, url.lastIndexOf('/') + 1) + '*',
      url
    ];

    return [...new Set(patterns)]; // Remove duplicates
  } catch {
    return [url, `*${url}*`];
  }
}

async function loadTags() {
  currentTab = await getCurrentTab();

  const res = await chrome.runtime.sendMessage({ type: "getTags" });
  tagsEl.innerHTML = "";
  if (res.ok && res.tags.length) {
    for (const tagInfo of res.tags) {
      const tagPath = getTagPath(tagInfo);
      const displayName = getTagDisplayName(tagInfo);
      const depth = typeof tagInfo === 'object' ? tagInfo.depth || 0 : 0;

      // Skip special tags "📁 All" and "📂 Other"
      if (tagPath === "📁 All" || tagPath === "📂 Other") {
        continue;
      }

      const row = document.createElement("div");
      row.className = "tag";
      row.style.marginLeft = `${depth * 15}px`; // Indent based on depth

      row.innerHTML = `
        <span class="tag-name">${displayName}</span>
        <small class="tag-action">Save & close</small>
        <div class="quick-actions">
          <button class="quick-btn this" title="Save current tab">This</button>
          <button class="quick-btn all" title="Save all tabs">All</button>
          <button class="quick-btn domain" title="Save all tabs from this domain">Domain</button>
          <button class="quick-btn regex" title="Create URL pattern rule">Regex</button>
        </div>
      `;

      // Default click behavior (save all tabs)
      row.addEventListener("click", async (e) => {
        if (e.target.classList.contains('quick-btn')) return; // Don't trigger for quick buttons
        const scope = $("#allWindows").checked ? "allWindows" : "currentWindow";
        const r = await chrome.runtime.sendMessage({ type: "saveAndClose", tag: tagPath, scope });
        if (r.ok) showToast(`Saved ${r.saved} tabs to "${displayName}"`);
        window.close();
      });

      // Quick action buttons
      const thisBtn = row.querySelector('.quick-btn.this');
      const allBtn = row.querySelector('.quick-btn.all');
      const domainBtn = row.querySelector('.quick-btn.domain');
      const regexBtn = row.querySelector('.quick-btn.regex');

      // "This" button - save current tab only
      thisBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!currentTab) return;

        const r = await chrome.runtime.sendMessage({
          type: "saveSpecificTabs",
          tag: tagPath,
          tabIds: [currentTab.id]
        });
        if (r.ok) showToast(`Saved current tab to "${displayName}"`);
        window.close();
      });

      // "All" button - save all tabs (same as default)
      allBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const scope = $("#allWindows").checked ? "allWindows" : "currentWindow";
        const r = await chrome.runtime.sendMessage({ type: "saveAndClose", tag: tagPath, scope });
        if (r.ok) showToast(`Saved ${r.saved} tabs to "${displayName}"`);
        window.close();
      });

      // "Domain" button - save all tabs from same domain
      domainBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!currentTab) return;

        const currentDomain = extractDomain(currentTab.url);
        const allTabs = await chrome.tabs.query({ currentWindow: !$("#allWindows").checked });
        const domainTabs = allTabs.filter(tab => extractDomain(tab.url) === currentDomain);

        if (domainTabs.length === 0) {
          showToast("No tabs found from this domain");
          return;
        }

        const r = await chrome.runtime.sendMessage({
          type: "saveSpecificTabs",
          tag: tagPath,
          tabIds: domainTabs.map(t => t.id)
        });
        if (r.ok) showToast(`Saved ${domainTabs.length} tabs from ${currentDomain} to "${displayName}"`);
        window.close();
      });

      // "Regex" button - open regex dialog
      regexBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!currentTab) return;
        openRegexDialog(tagPath, displayName);
      });

      tagsEl.appendChild(row);
    }
  } else {
    const empty = document.createElement("div");
    empty.style.cssText = "padding:12px; color: rgba(233, 235, 234, 0.6); font-size:13px; text-align: center;";
    empty.textContent = "No tags yet. Create your first tag below.";
    tagsEl.appendChild(empty);
  }
}

function openRegexDialog(tagPath, displayName) {
  currentTagForRegex = { path: tagPath, display: displayName };
  const dialog = $("#regexDialog");
  const input = $("#regexInput");
  const suggestions = $("#regexSuggestions");

  // Generate URL pattern suggestions
  const patterns = generateUrlPatterns(currentTab.url);
  suggestions.innerHTML = '';

  patterns.forEach(pattern => {
    const suggestion = document.createElement('button');
    suggestion.className = 'suggestion';
    suggestion.textContent = pattern;
    suggestion.addEventListener('click', () => {
      input.value = pattern;
    });
    suggestions.appendChild(suggestion);
  });

  // Pre-fill with the most common pattern
  input.value = patterns[0] || '';

  dialog.style.display = 'flex';
  input.focus();
}

function closeRegexDialog() {
  $("#regexDialog").style.display = 'none';
  currentTagForRegex = null;
}

// Regex dialog event listeners
$("#regexCancel").addEventListener("click", closeRegexDialog);

$("#regexSave").addEventListener("click", async () => {
  const pattern = $("#regexInput").value.trim();
  if (!pattern || !currentTagForRegex) return;

  try {
    // Here we would add the pattern to the tag's classification rules
    // For now, we'll use a new message type that should be implemented in background.js
    const r = await chrome.runtime.sendMessage({
      type: "addUrlPatternRule",
      tag: currentTagForRegex.path,
      pattern: pattern
    });

    if (r.ok) {
      showToast(`Added pattern "${pattern}" to ${currentTagForRegex.display}`);
    } else {
      showToast("Error: " + (r.error || "Failed to add pattern"));
    }
  } catch (error) {
    console.error('Error adding pattern:', error);
    showToast("Error adding pattern rule");
  }

  closeRegexDialog();
});

// Close dialog on escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("#regexDialog").style.display === 'flex') {
    closeRegexDialog();
  }
});

// Close dialog when clicking outside
$("#regexDialog").addEventListener("click", (e) => {
  if (e.target === $("#regexDialog")) {
    closeRegexDialog();
  }
});

$("#createNew").addEventListener("click", async () => {
  const name = prompt("New tag name:");
  if (!name) return;
  const scope = $("#allWindows").checked ? "allWindows" : "currentWindow";
  const r = await chrome.runtime.sendMessage({ type: "saveAndClose", tag: name.trim(), scope });
  if (r.ok) showToast(`Saved ${r.saved} tabs to "${name}"`);
  window.close();
});

$("#autoClassify").addEventListener("click", async () => {
  const scope = $("#allWindows").checked ? "allWindows" : "currentWindow";
  const r = await chrome.runtime.sendMessage({
    type: "saveAndClose",
    tag: "Other", // Fallback tag for unclassified tabs
    scope,
    useClassification: true
  });
  if (r.ok) showToast(`Auto-classified and saved ${r.saved} tabs`);
  window.close();
});

$("#openManager").addEventListener("click", () => {
  // allow default link behavior
});

loadTags();
