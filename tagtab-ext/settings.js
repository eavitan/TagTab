// settings.js - Settings page functionality

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

let currentSettings = {};
let classificationRules = {};
let allTags = [];

// Tab navigation
function initTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      // Update nav
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update content
      $$('.tab-content').forEach(content => content.classList.remove('active'));
      $(`#${tabId}-tab`).classList.add('active');
    });
  });
}

// Load settings from storage
async function loadSettings() {
  try {
    const [settingsRes, rulesRes, tagsRes] = await Promise.all([
      chrome.runtime.sendMessage({ type: "getGlobalSettings" }),
      chrome.runtime.sendMessage({ type: "getClassificationRules" }),
      chrome.runtime.sendMessage({ type: "getTags" })
    ]);

    if (settingsRes.ok) {
      currentSettings = settingsRes.settings;
      populateGeneralSettings();
    }

    if (rulesRes.ok) {
      classificationRules = rulesRes.rules;
      populateClassificationRules();
    }

    if (tagsRes.ok) {
      allTags = tagsRes.tags;
      populateTagSettings();
      populateParentTagSelect();
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
}

// Populate general settings
function populateGeneralSettings() {
  // Restore behavior
  const restoreMode = currentSettings.defaultRestoreMode || 'close';
  $(`input[name="defaultRestoreMode"][value="${restoreMode}"]`).checked = true;

  // Page behavior
  $('#enableNewTabOverride').checked = currentSettings.enableNewTabOverride !== false;
  $('#enableClassification').checked = currentSettings.enableClassification !== false;
}

// Populate classification rules
function populateClassificationRules() {
  const container = $('#classificationRules');
  container.innerHTML = '';

  Object.entries(classificationRules).forEach(([tagName, rule]) => {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'rule-item';

    const urlPatterns = rule.urlPatterns || [];
    const titleKeywords = rule.titleKeywords || [];

    ruleDiv.innerHTML = `
      <div class="rule-info">
        <div class="rule-tag">${tagName}</div>
        <div class="rule-patterns">
          ${urlPatterns.length > 0 ? `URLs: ${urlPatterns.slice(0, 3).join(', ')}${urlPatterns.length > 3 ? '...' : ''}` : ''}
          ${urlPatterns.length > 0 && titleKeywords.length > 0 ? '<br>' : ''}
          ${titleKeywords.length > 0 ? `Keywords: ${titleKeywords.slice(0, 5).join(', ')}${titleKeywords.length > 5 ? '...' : ''}` : ''}
        </div>
      </div>
      <div class="rule-actions">
        <button class="btn-secondary btn-small edit-rule-btn" data-tag="${tagName}">Edit</button>
        <button class="btn-danger btn-small delete-rule-btn" data-tag="${tagName}">Delete</button>
      </div>
    `;

    container.appendChild(ruleDiv);
  });

  // Add event listeners for edit and delete buttons
  container.querySelectorAll('.edit-rule-btn').forEach(btn => {
    btn.addEventListener('click', () => editRule(btn.dataset.tag));
  });

  container.querySelectorAll('.delete-rule-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRule(btn.dataset.tag));
  });
}

// Populate tag settings
async function populateTagSettings() {
  const container = $('#tagSettingsList');
  container.innerHTML = '';

  // Get flat list of tag names (not hierarchical objects)
  const tagList = allTags.filter(tag => {
    // Filter out special tags and extract actual tag names
    const tagName = typeof tag === 'string' ? tag : tag.path;
    return !tagName.startsWith('📁') && !tagName.startsWith('📂');
  }).map(tag => typeof tag === 'string' ? tag : tag.path);

  for (const tagName of tagList) {
    try {
      const res = await chrome.runtime.sendMessage({
        type: "getTagSettings",
        tag: tagName
      });

      if (res.ok) {
        const settings = res.settings;
        const tagDiv = document.createElement('div');
        tagDiv.className = 'tag-setting-item';

        // Get classification rules for this tag
        const tagRules = classificationRules[tagName] || { urlPatterns: [], titleKeywords: [] };
        const urlPatterns = tagRules.urlPatterns || [];
        const titleKeywords = tagRules.titleKeywords || [];

        tagDiv.innerHTML = `
          <div class="tag-header">
            <div class="tag-info">
              <div class="tag-name">${tagName}</div>
              <div class="tag-meta">
                Restore: ${settings.restoreBehavior || 'Use global default'}
              </div>
            </div>
            <div class="tag-controls">
              <input type="color" class="color-picker" value="${settings.color || '#007bff'}" data-tag="${tagName}">
              <select class="restore-behavior-select" data-tag="${tagName}">
                <option value="">Use global default</option>
                <option value="close" ${settings.restoreBehavior === 'close' ? 'selected' : ''}>Restore and close</option>
                <option value="keep" ${settings.restoreBehavior === 'keep' ? 'selected' : ''}>Restore and keep</option>
              </select>
              <button class="btn-danger btn-small delete-tag-btn" data-tag="${tagName}">Delete</button>
            </div>
          </div>
          <div class="tag-rules">
            <div class="rule-section">
              <strong>Classification Rules:</strong>
              ${urlPatterns.length > 0 ? `
                <div class="rule-group">
                  <em>URL Patterns:</em> ${urlPatterns.join(', ')}
                </div>
              ` : ''}
              ${titleKeywords.length > 0 ? `
                <div class="rule-group">
                  <em>Keywords:</em> ${titleKeywords.join(', ')}
                </div>
              ` : ''}
              ${urlPatterns.length === 0 && titleKeywords.length === 0 ? '<em>No classification rules</em>' : ''}
            </div>
            <div class="rule-controls">
              <button class="btn-secondary btn-small edit-rules-btn" data-tag="${tagName}">Edit Rules</button>
            </div>
          </div>
        `;

        container.appendChild(tagDiv);
      }
    } catch (e) {
      console.error(`Error loading settings for tag ${tagName}:`, e);
    }
  }

  // Add event listeners for color pickers
  container.querySelectorAll('.color-picker').forEach(picker => {
    picker.addEventListener('change', (e) => {
      updateTagColor(e.target.dataset.tag, e.target.value);
    });
  });

  // Add event listeners for restore behavior selects
  container.querySelectorAll('.restore-behavior-select').forEach(select => {
    select.addEventListener('change', (e) => {
      updateTagRestoreBehavior(e.target.dataset.tag, e.target.value);
    });
  });

  // Add event listeners for edit rules buttons
  container.querySelectorAll('.edit-rules-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.editTagRules(btn.dataset.tag);
    });
  });

  // Add event listeners for delete tag buttons
  container.querySelectorAll('.delete-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.deleteTagConfirm(btn.dataset.tag);
    });
  });
}

// Event handlers
window.editRule = async function(tagName) {
  const rule = classificationRules[tagName];
  if (!rule) return;

  const newUrlPattern = prompt('URL patterns (comma-separated):', (rule.urlPatterns || []).join(', '));
  const newTitleKeywords = prompt('Title keywords (comma-separated):', (rule.titleKeywords || []).join(', '));

  if (newUrlPattern !== null && newTitleKeywords !== null) {
    classificationRules[tagName] = {
      urlPatterns: newUrlPattern.split(',').map(s => s.trim()).filter(s => s),
      titleKeywords: newTitleKeywords.split(',').map(s => s.trim()).filter(s => s)
    };

    // Save changes to storage
    try {
      const response = await chrome.runtime.sendMessage({
        type: "setClassificationRules",
        rules: classificationRules
      });

      if (response.ok) {
        populateClassificationRules();
        console.log('Classification rules updated successfully');
      } else {
        throw new Error(response.error || 'Failed to save classification rules');
      }
    } catch (e) {
      console.error('Error saving classification rules:', e);
      alert('Error saving changes: ' + e.message);
    }
  }
};

window.deleteRule = async function(tagName) {
  if (confirm(`Delete classification rule for "${tagName}"?`)) {
    delete classificationRules[tagName];

    // Save changes to storage
    try {
      const response = await chrome.runtime.sendMessage({
        type: "setClassificationRules",
        rules: classificationRules
      });

      if (response.ok) {
        populateClassificationRules();
        console.log('Classification rule deleted successfully');
      } else {
        throw new Error(response.error || 'Failed to delete classification rule');
      }
    } catch (e) {
      console.error('Error saving classification rules:', e);
      alert('Error deleting rule: ' + e.message);
    }
  }
};

window.updateTagColor = async function(tagName, color) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "setTagSettings",
      tag: tagName,
      settings: { color }
    });

    if (response.ok) {
      // Refresh the tag settings to show the update
      await populateTagSettings();
    } else {
      throw new Error(response.error || 'Failed to update tag color');
    }
  } catch (e) {
    console.error('Error updating tag color:', e);
    alert('Error updating tag color: ' + e.message);
  }
};

window.updateTagRestoreBehavior = async function(tagName, behavior) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "setTagSettings",
      tag: tagName,
      settings: { restoreBehavior: behavior || null }
    });

    if (response.ok) {
      // Refresh the tag settings to show the update
      await populateTagSettings();
    } else {
      throw new Error(response.error || 'Failed to update tag restore behavior');
    }
  } catch (e) {
    console.error('Error updating tag restore behavior:', e);
    alert('Error updating tag restore behavior: ' + e.message);
  }
};

window.configureTagRules = async function(tagName) {
  const rule = classificationRules[tagName] || { urlPatterns: [], titleKeywords: [] };

  const newUrlPattern = prompt('URL patterns for this tag (comma-separated):', (rule.urlPatterns || []).join(', '));
  const newTitleKeywords = prompt('Title keywords for this tag (comma-separated):', (rule.titleKeywords || []).join(', '));

  if (newUrlPattern !== null && newTitleKeywords !== null) {
    classificationRules[tagName] = {
      urlPatterns: newUrlPattern.split(',').map(s => s.trim()).filter(s => s),
      titleKeywords: newTitleKeywords.split(',').map(s => s.trim()).filter(s => s)
    };

    // Save changes to storage
    try {
      const response = await chrome.runtime.sendMessage({
        type: "setClassificationRules",
        rules: classificationRules
      });

      if (response.ok) {
        populateClassificationRules();
        console.log('Tag rules configured successfully');
      } else {
        throw new Error(response.error || 'Failed to save tag rules');
      }
    } catch (e) {
      console.error('Error saving classification rules:', e);
      alert('Error saving tag rules: ' + e.message);
    }
  }
};

// Edit tag rules by populating the existing form
window.editTagRules = async function(tagName) {
  // Get the latest classification rules to ensure we have fresh data
  try {
    const latestRulesResponse = await chrome.runtime.sendMessage({
      type: "getClassificationRules"
    });

    if (latestRulesResponse.ok) {
      window.classificationRules = latestRulesResponse.rules;
    }
  } catch (e) {
    console.warn('Could not fetch latest rules for editing:', e);
  }

  // Switch to the "Create Tag" form and populate it with existing rule data
  const rule = classificationRules[tagName] || { urlPatterns: [], titleKeywords: [] };

  // Focus on the Tag Settings tab
  const tagSettingsTab = document.querySelector('[data-tab="tags"]');
  if (tagSettingsTab) {
    tagSettingsTab.click();
  }

  // Populate the form with existing tag data
  $('#subTagName').value = extractTagName(tagName);

  // Set parent if it's a hierarchical tag
  const parentPath = getParentPath(tagName);
  if (parentPath) {
    $('#parentTagSelect').value = parentPath;
  } else {
    $('#parentTagSelect').value = '';
  }

  // Clear and rebuild the simple rules form with existing rules
  populateSimpleRulesFromExistingRules(rule);

  // Change button text to indicate editing mode
  const createBtn = $('#createSubTag');
  createBtn.textContent = 'Update Tag Rules';
  createBtn.dataset.editingTag = tagName;

  // Scroll to the form
  document.querySelector('.classification-form').scrollIntoView({ behavior: 'smooth' });
};

// Delete tag with confirmation
window.deleteTagConfirm = async function(tagName) {
  if (confirm(`Delete tag "${tagName}" and all its saved items? This cannot be undone.`)) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "deleteTag",
        tag: tagName
      });

      if (response.ok) {
        // Remove from classification rules if exists
        if (classificationRules[tagName]) {
          delete classificationRules[tagName];
          await chrome.runtime.sendMessage({
            type: "setClassificationRules",
            rules: classificationRules
          });
        }

        // Reload settings to refresh the display
        await loadSettings();
        console.log('Tag deleted successfully');
      } else {
        throw new Error(response.error || 'Failed to delete tag');
      }
    } catch (e) {
      console.error('Error deleting tag:', e);
      alert('Error deleting tag: ' + e.message);
    }
  }
};

// Populate parent tag select dropdown
function populateParentTagSelect() {
  const select = $('#parentTagSelect');

  // Clear existing options except the first one
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }

  // Get flat list of regular tag names (not hierarchical objects)
  const tagList = allTags.filter(tag => {
    const tagPath = typeof tag === 'string' ? tag : tag.path;
    return !tagPath.startsWith('📁') && !tagPath.startsWith('📂');
  }).map(tag => typeof tag === 'string' ? tag : tag.path);

  // Add each tag as an option
  tagList.forEach(tagPath => {
    const option = document.createElement('option');
    option.value = tagPath;
    option.textContent = tagPath;
    select.appendChild(option);
  });
}

// Reset rules
$('#resetRules').addEventListener('click', async () => {
  if (confirm('Reset all classification rules to defaults? This cannot be undone.')) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "resetClassificationRules" });
      if (res.ok) {
        classificationRules = res.rules;
        populateClassificationRules();
      }
    } catch (e) {
      console.error('Error resetting rules:', e);
    }
  }
});

// Save settings
$('#saveSettings').addEventListener('click', async () => {
  try {
    // Gather general settings
    const newSettings = {
      defaultRestoreMode: $('input[name="defaultRestoreMode"]:checked').value,
      enableNewTabOverride: $('#enableNewTabOverride').checked,
      enableClassification: $('#enableClassification').checked
    };

    // Save general settings
    await chrome.runtime.sendMessage({
      type: "setGlobalSettings",
      settings: newSettings
    });

    // Save classification rules
    await chrome.runtime.sendMessage({
      type: "setClassificationRules",
      rules: classificationRules
    });

    alert('Settings saved successfully!');
  } catch (e) {
    console.error('Error saving settings:', e);
    alert('Error saving settings: ' + e.message);
  }
});

// Export settings
$('#exportSettings').addEventListener('click', () => {
  const exportData = {
    globalSettings: currentSettings,
    classificationRules: classificationRules,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tagtab-settings-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Import settings
$('#importSettings').addEventListener('click', () => {
  $('#importFile').click();
});

$('#importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importData = JSON.parse(e.target.result);

      if (importData.globalSettings) {
        currentSettings = importData.globalSettings;
        await chrome.runtime.sendMessage({
          type: "setGlobalSettings",
          settings: currentSettings
        });
        populateGeneralSettings();
      }

      if (importData.classificationRules) {
        classificationRules = importData.classificationRules;
        await chrome.runtime.sendMessage({
          type: "setClassificationRules",
          rules: classificationRules
        });
        populateClassificationRules();
      }

      alert('Settings imported successfully!');
    } catch (e) {
      alert('Error importing settings: ' + e.message);
    }
  };
  reader.readAsText(file);
});

// Create tag (root tag or sub-tag) or update existing tag rules
$('#createSubTag').addEventListener('click', async () => {
  const parentPath = $('#parentTagSelect').value;
  const tagName = $('#subTagName').value.trim();
  const isEditMode = $('#createSubTag').dataset.editingTag;

  if (!tagName) {
    alert('Please enter a tag name');
    return;
  }

  // Validate tag name (no slashes, special characters)
  if (tagName.includes('/')) {
    alert('Tag name cannot contain forward slashes');
    return;
  }

  // Build classification rules from the simple form
  const classificationRules = buildSimpleRulesFromForm();

  try {
    let response;
    let successMessage;
    let finalTagName;

    if (isEditMode) {
      // Editing existing tag rules
      finalTagName = isEditMode;
      successMessage = `Rules for "${finalTagName}" updated successfully!`;
      response = { ok: true }; // Skip tag creation
    } else {
      // Creating new tag
      finalTagName = parentPath ? `${parentPath}/${tagName}` : tagName;

      if (parentPath) {
        // Create sub-tag
        response = await chrome.runtime.sendMessage({
          type: "createSubTag",
          parentPath: parentPath,
          subTagName: tagName
        });
        successMessage = `Sub-tag "${parentPath}/${tagName}" created successfully!`;
      } else {
        // Create root tag
        response = await chrome.runtime.sendMessage({
          type: "createTag",
          tagName: tagName
        });
        successMessage = `Root tag "${tagName}" created successfully!`;
      }
    }

    if (response.ok) {
      // Get the latest classification rules from storage to avoid stale data
      const latestRulesResponse = await chrome.runtime.sendMessage({
        type: "getClassificationRules"
      });

      let updatedRules = {};
      if (latestRulesResponse.ok) {
        updatedRules = { ...latestRulesResponse.rules };
      } else {
        console.warn('Could not fetch latest rules, using local copy');
        updatedRules = { ...window.classificationRules };
      }

      // Update the specific tag's rules
      updatedRules[finalTagName] = classificationRules;

      const rulesResponse = await chrome.runtime.sendMessage({
        type: "setClassificationRules",
        rules: updatedRules
      });

      if (!rulesResponse.ok) {
        console.error('Failed to save classification rules:', rulesResponse.error);
        alert(isEditMode ? 'Failed to save rule updates' : 'Tag created but failed to save classification rules');
      } else {
        window.classificationRules = updatedRules;
      }

      // Clear form and reset to creation mode
      $('#parentTagSelect').value = '';
      $('#subTagName').value = '';
      clearSimpleRulesBuilder();

      // Reset button state
      const createBtn = $('#createSubTag');
      createBtn.textContent = 'Create Tag';
      delete createBtn.dataset.editingTag;

      // Reload settings to refresh dropdowns and lists
      await loadSettings();

      alert(successMessage);
    } else {
      throw new Error(response.error || 'Failed to create tag');
    }
  } catch (e) {
    console.error('Error creating/updating tag:', e);
    alert('Error creating/updating tag: ' + e.message);
  }
});

// Simple Classification Builder
let nextSimpleRuleId = 1;

function initSimpleRulesBuilder() {
  const builder = $('#simpleRulesBuilder');

  // Add event listeners for the initial rule item
  addSimpleRuleListeners(builder.querySelector('.simple-rule-item'));

  // Add listener for add rule button
  $('#addSimpleRuleBtn').addEventListener('click', addSimpleRule);

  updateSimpleRulePreview();
}

function addSimpleRuleListeners(ruleElement) {
  const removeBtn = ruleElement.querySelector('.remove-rule-btn');
  const typeSelect = ruleElement.querySelector('.rule-type');
  const patternInput = ruleElement.querySelector('.rule-pattern');

  removeBtn.addEventListener('click', () => removeSimpleRule(ruleElement));
  typeSelect.addEventListener('change', updateSimpleRulePreview);
  patternInput.addEventListener('input', updateSimpleRulePreview);
}

function addSimpleRule() {
  const rulesList = $('.simple-rules-list');
  const ruleDiv = document.createElement('div');
  ruleDiv.className = 'simple-rule-item';
  ruleDiv.setAttribute('data-rule-id', nextSimpleRuleId++);

  ruleDiv.innerHTML = `
    <select class="rule-type">
      <option value="url">URL Pattern</option>
      <option value="title">Title Keyword</option>
    </select>
    <input type="text" class="rule-pattern" placeholder="e.g. *github.com* or figma.com*optibus">
    <button type="button" class="btn-small btn-danger remove-rule-btn">Remove</button>
  `;

  rulesList.appendChild(ruleDiv);
  addSimpleRuleListeners(ruleDiv);
  updateSimpleRulePreview();

  // Focus on the new input
  ruleDiv.querySelector('.rule-pattern').focus();
}

function removeSimpleRule(ruleElement) {
  const rulesList = $('.simple-rules-list');

  // Don't allow removing the last rule
  if (rulesList.children.length > 1) {
    ruleElement.remove();
    updateSimpleRulePreview();
  } else {
    alert('At least one pattern field is required');
  }
}

function updateSimpleRulePreview() {
  const preview = $('#simpleRulePreview');
  const rules = buildSimpleRulesFromForm();
  preview.textContent = generateSimpleRulePreviewText(rules);
}

function buildSimpleRulesFromForm() {
  const rulesList = $('.simple-rules-list');
  const urlPatterns = [];
  const titleKeywords = [];

  rulesList.querySelectorAll('.simple-rule-item').forEach(ruleElement => {
    const type = ruleElement.querySelector('.rule-type').value;
    const pattern = ruleElement.querySelector('.rule-pattern').value.trim();

    if (pattern) {
      if (type === 'url') {
        urlPatterns.push(pattern);
      } else if (type === 'title') {
        titleKeywords.push(pattern);
      }
    }
  });

  return { urlPatterns, titleKeywords };
}

function generateSimpleRulePreviewText(rules) {
  const { urlPatterns, titleKeywords } = rules;
  const patterns = [];

  urlPatterns.forEach(pattern => {
    patterns.push(`URL matches "${pattern}"`);
  });

  titleKeywords.forEach(keyword => {
    patterns.push(`title contains "${keyword}"`);
  });

  if (patterns.length === 0) {
    return 'No patterns defined';
  } else if (patterns.length === 1) {
    return patterns[0];
  } else {
    return patterns.join(' OR ');
  }
}

function clearSimpleRulesBuilder() {
  const rulesList = $('.simple-rules-list');

  // Reset to single rule
  rulesList.innerHTML = `
    <div class="simple-rule-item" data-rule-id="0">
      <select class="rule-type">
        <option value="url">URL Pattern</option>
        <option value="title">Title Keyword</option>
      </select>
      <input type="text" class="rule-pattern" placeholder="e.g. *github.com* or figma.com*optibus">
      <button type="button" class="btn-small btn-danger remove-rule-btn">Remove</button>
    </div>
  `;

  // Reset counter
  nextSimpleRuleId = 1;

  // Reinitialize listeners
  addSimpleRuleListeners(rulesList.querySelector('.simple-rule-item'));
  updateSimpleRulePreview();
}

function populateSimpleRulesFromExistingRules(rule) {
  const rulesList = $('.simple-rules-list');

  // Clear existing rules
  rulesList.innerHTML = '';

  const urlPatterns = rule.urlPatterns || [];
  const titleKeywords = rule.titleKeywords || [];
  let ruleIndex = 0;

  // Add URL patterns
  urlPatterns.forEach(pattern => {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'simple-rule-item';
    ruleDiv.setAttribute('data-rule-id', ruleIndex++);

    ruleDiv.innerHTML = `
      <select class="rule-type">
        <option value="url" selected>URL Pattern</option>
        <option value="title">Title Keyword</option>
      </select>
      <input type="text" class="rule-pattern" value="${pattern}" placeholder="e.g. *github.com* or figma.com*optibus">
      <button type="button" class="btn-small btn-danger remove-rule-btn">Remove</button>
    `;

    rulesList.appendChild(ruleDiv);
    addSimpleRuleListeners(ruleDiv);
  });

  // Add title keywords
  titleKeywords.forEach(keyword => {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'simple-rule-item';
    ruleDiv.setAttribute('data-rule-id', ruleIndex++);

    ruleDiv.innerHTML = `
      <select class="rule-type">
        <option value="url">URL Pattern</option>
        <option value="title" selected>Title Keyword</option>
      </select>
      <input type="text" class="rule-pattern" value="${keyword}" placeholder="e.g. *github.com* or figma.com*optibus">
      <button type="button" class="btn-small btn-danger remove-rule-btn">Remove</button>
    `;

    rulesList.appendChild(ruleDiv);
    addSimpleRuleListeners(ruleDiv);
  });

  // If no rules exist, add a blank one
  if (urlPatterns.length === 0 && titleKeywords.length === 0) {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'simple-rule-item';
    ruleDiv.setAttribute('data-rule-id', 0);

    ruleDiv.innerHTML = `
      <select class="rule-type">
        <option value="url">URL Pattern</option>
        <option value="title">Title Keyword</option>
      </select>
      <input type="text" class="rule-pattern" placeholder="e.g. *github.com* or figma.com*optibus">
      <button type="button" class="btn-small btn-danger remove-rule-btn">Remove</button>
    `;

    rulesList.appendChild(ruleDiv);
    addSimpleRuleListeners(ruleDiv);
  }

  // Update counters and preview
  nextSimpleRuleId = rulesList.children.length;
  updateSimpleRulePreview();
}




function extractTagName(fullTagPath) {
  const lastSlash = fullTagPath.lastIndexOf('/');
  return lastSlash >= 0 ? fullTagPath.substring(lastSlash + 1) : fullTagPath;
}

function getParentPath(fullTagPath) {
  const lastSlash = fullTagPath.lastIndexOf('/');
  return lastSlash > 0 ? fullTagPath.substring(0, lastSlash) : '';
}


// Removed modal-based editing - now using form population instead

// Modal functions removed - using form population approach instead

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadSettings();
  initSimpleRulesBuilder();
});