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

async function loadTags() {
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
      row.innerHTML = `<span>${displayName}</span><small>Save & close</small>`;
      row.addEventListener("click", async () => {
        const scope = $("#allWindows").checked ? "allWindows" : "currentWindow";
        const r = await chrome.runtime.sendMessage({ type: "saveAndClose", tag: tagPath, scope });
        if (r.ok) showToast(`Saved ${r.saved} tabs to "${displayName}"`);
        window.close();
      });
      tagsEl.appendChild(row);
    }
  } else {
    const empty = document.createElement("div");
    empty.style.cssText = "padding:8px; color:#666; font-size:13px;";
    empty.textContent = "No tags yet.";
    tagsEl.appendChild(empty);
  }
}

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
