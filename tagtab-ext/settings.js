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

  // Clear and rebuild the conditions form with existing rules
  populateConditionsFromExistingRules(rule);

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

  // Build classification rules from the advanced form
  const advancedRules = buildRulesFromForm();
  const classificationRules = convertAdvancedRulesToLegacy(advancedRules);

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
      clearConditionsBuilder();

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

// Advanced Classification Builder
let nextConditionId = 1;
let nextGroupId = 1;

function initConditionsBuilder() {
  const builder = $('#conditionsBuilder');

  // Add event listeners for the initial condition group
  addConditionGroupListeners(builder.querySelector('.condition-group'));
  updateRulePreview();
}

function addConditionGroupListeners(groupElement) {
  const addConditionBtn = groupElement.querySelector('.add-condition-btn');
  const addGroupBtn = groupElement.querySelector('.add-group-btn');
  const groupOperator = groupElement.querySelector('.group-operator');

  addConditionBtn.addEventListener('click', () => addCondition(groupElement));
  addGroupBtn.addEventListener('click', () => addConditionGroup());
  groupOperator.addEventListener('change', updateRulePreview);

  // Add listeners to existing conditions
  groupElement.querySelectorAll('.condition-item').forEach(addConditionListeners);
}

function addConditionListeners(conditionElement) {
  const removeBtn = conditionElement.querySelector('.remove-condition-btn');
  const typeSelect = conditionElement.querySelector('.condition-type');
  const valueInput = conditionElement.querySelector('.condition-value');

  removeBtn.addEventListener('click', () => removeCondition(conditionElement));
  typeSelect.addEventListener('change', updateRulePreview);
  valueInput.addEventListener('input', updateRulePreview);
}

function addCondition(groupElement) {
  const conditionsList = groupElement.querySelector('.conditions-list');
  const conditionDiv = document.createElement('div');
  conditionDiv.className = 'condition-item';
  conditionDiv.setAttribute('data-condition-id', nextConditionId++);

  conditionDiv.innerHTML = `
    <select class="condition-type">
      <option value="url">URL Pattern</option>
      <option value="title">Title Keyword</option>
    </select>
    <input type="text" class="condition-value" placeholder="e.g. *.github.com/* or github">
    <button type="button" class="btn-small btn-danger remove-condition-btn">Remove</button>
  `;

  conditionsList.appendChild(conditionDiv);
  addConditionListeners(conditionDiv);
  updateRulePreview();
}

function removeCondition(conditionElement) {
  const groupElement = conditionElement.closest('.condition-group');
  const conditionsList = groupElement.querySelector('.conditions-list');

  // Don't allow removing the last condition in a group
  if (conditionsList.children.length > 1) {
    conditionElement.remove();
    updateRulePreview();
  } else {
    alert('Each group must have at least one condition');
  }
}

function addConditionGroup() {
  const builder = $('#conditionsBuilder');
  const groupDiv = document.createElement('div');
  groupDiv.className = 'condition-group';
  groupDiv.setAttribute('data-group-id', nextGroupId++);

  groupDiv.innerHTML = `
    <div class="group-header">
      <span class="group-label">Rule Group</span>
      <select class="group-operator">
        <option value="AND">AND</option>
        <option value="OR">OR</option>
      </select>
      <button type="button" class="btn-small btn-secondary add-condition-btn">Add Condition</button>
      <button type="button" class="btn-small btn-secondary add-group-btn">Add Group</button>
      <button type="button" class="btn-small btn-danger remove-group-btn">Remove Group</button>
    </div>
    <div class="conditions-list">
      <div class="condition-item" data-condition-id="${nextConditionId++}">
        <select class="condition-type">
          <option value="url">URL Pattern</option>
          <option value="title">Title Keyword</option>
        </select>
        <input type="text" class="condition-value" placeholder="e.g. *.github.com/* or github">
        <button type="button" class="btn-small btn-danger remove-condition-btn">Remove</button>
      </div>
    </div>
  `;

  builder.appendChild(groupDiv);
  addConditionGroupListeners(groupDiv);

  // Add remove group listener
  const removeGroupBtn = groupDiv.querySelector('.remove-group-btn');
  removeGroupBtn.addEventListener('click', () => removeConditionGroup(groupDiv));

  updateRulePreview();
}

function removeConditionGroup(groupElement) {
  const builder = $('#conditionsBuilder');

  // Don't allow removing the last group
  if (builder.children.length > 1) {
    groupElement.remove();
    updateRulePreview();
  } else {
    alert('At least one rule group is required');
  }
}

function updateRulePreview() {
  const preview = $('#rulePreview');
  const rules = buildRulesFromForm();
  preview.textContent = generateRulePreviewText(rules);
}

function buildRulesFromForm() {
  const builder = $('#conditionsBuilder');
  const groups = [];

  builder.querySelectorAll('.condition-group').forEach(groupElement => {
    const operator = groupElement.querySelector('.group-operator').value;
    const conditions = [];

    groupElement.querySelectorAll('.condition-item').forEach(conditionElement => {
      const type = conditionElement.querySelector('.condition-type').value;
      const value = conditionElement.querySelector('.condition-value').value.trim();

      if (value) {
        conditions.push({ type, value });
      }
    });

    if (conditions.length > 0) {
      groups.push({ operator, conditions });
    }
  });

  return groups;
}

function generateRulePreviewText(groups) {
  if (groups.length === 0) return 'No conditions defined';

  // Show what the user built
  const groupTexts = groups.map(group => {
    const conditionTexts = group.conditions.map(condition => {
      const type = condition.type === 'url' ? 'URL matches' : 'title contains';
      return `${type} "${condition.value}"`;
    });

    if (conditionTexts.length === 1) {
      return conditionTexts[0];
    } else {
      return `(${conditionTexts.join(` ${group.operator} `)})`;
    }
  });

  const complexPreview = groupTexts.join(' AND ');

  // Show what actually gets stored (flattened)
  const legacy = convertAdvancedRulesToLegacy(groups);
  const hasComplexLogic = groups.some(group =>
    group.operator === 'OR' || group.conditions.length > 1
  ) && groups.length > 1;

  if (hasComplexLogic) {
    return `${complexPreview}\n\nNote: Currently stored as simple lists - URL patterns: [${legacy.urlPatterns.join(', ')}], Keywords: [${legacy.titleKeywords.join(', ')}]`;
  }

  return complexPreview;
}

function convertAdvancedRulesToLegacy(advancedRules) {
  // For backward compatibility, also provide simple arrays
  const urlPatterns = [];
  const titleKeywords = [];

  advancedRules.forEach(group => {
    group.conditions.forEach(condition => {
      if (condition.type === 'url' && condition.value) {
        urlPatterns.push(condition.value);
      } else if (condition.type === 'title' && condition.value) {
        titleKeywords.push(condition.value);
      }
    });
  });

  // Return both advanced structure and legacy arrays
  return {
    urlPatterns,
    titleKeywords,
    advancedRules // Preserve the full structure
  };
}

function clearConditionsBuilder() {
  const builder = $('#conditionsBuilder');

  // Reset to single group with single condition
  builder.innerHTML = `
    <div class="condition-group" data-group-id="0">
      <div class="group-header">
        <span class="group-label">Rule Group</span>
        <select class="group-operator">
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <button type="button" class="btn-small btn-secondary add-condition-btn">Add Condition</button>
        <button type="button" class="btn-small btn-secondary add-group-btn">Add Group</button>
      </div>
      <div class="conditions-list">
        <div class="condition-item" data-condition-id="0">
          <select class="condition-type">
            <option value="url">URL Pattern</option>
            <option value="title">Title Keyword</option>
          </select>
          <input type="text" class="condition-value" placeholder="e.g. *.github.com/* or github">
          <button type="button" class="btn-small btn-danger remove-condition-btn">Remove</button>
        </div>
      </div>
    </div>
  `;

  // Reset counters
  nextConditionId = 1;
  nextGroupId = 1;

  // Reinitialize listeners
  addConditionGroupListeners(builder.querySelector('.condition-group'));
  updateRulePreview();
}

function extractTagName(fullTagPath) {
  const lastSlash = fullTagPath.lastIndexOf('/');
  return lastSlash >= 0 ? fullTagPath.substring(lastSlash + 1) : fullTagPath;
}

function getParentPath(fullTagPath) {
  const lastSlash = fullTagPath.lastIndexOf('/');
  return lastSlash > 0 ? fullTagPath.substring(0, lastSlash) : '';
}

function populateConditionsFromExistingRules(rule) {
  const builder = $('#conditionsBuilder');

  // Clear existing conditions
  builder.innerHTML = '';

  // Check if we have advanced rules stored
  const hasAdvancedRules = rule.advancedRules && rule.advancedRules.length > 0;

  if (hasAdvancedRules) {
    // Populate from advanced rules structure
    rule.advancedRules.forEach((group, groupIndex) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'condition-group';
      groupDiv.setAttribute('data-group-id', groupIndex);

      let removeGroupBtn = '';
      if (groupIndex > 0) {
        removeGroupBtn = '<button type="button" class="btn-small btn-danger remove-group-btn">Remove Group</button>';
      }

      groupDiv.innerHTML = `
        <div class="group-header">
          <span class="group-label">Rule Group</span>
          <select class="group-operator">
            <option value="AND" ${group.operator === 'AND' ? 'selected' : ''}>AND</option>
            <option value="OR" ${group.operator === 'OR' ? 'selected' : ''}>OR</option>
          </select>
          <button type="button" class="btn-small btn-secondary add-condition-btn">Add Condition</button>
          <button type="button" class="btn-small btn-secondary add-group-btn">Add Group</button>
          ${removeGroupBtn}
        </div>
        <div class="conditions-list">
          ${group.conditions.map((condition, condIndex) => `
            <div class="condition-item" data-condition-id="${groupIndex}_${condIndex}">
              <select class="condition-type">
                <option value="url" ${condition.type === 'url' ? 'selected' : ''}>URL Pattern</option>
                <option value="title" ${condition.type === 'title' ? 'selected' : ''}>Title Keyword</option>
              </select>
              <input type="text" class="condition-value" value="${condition.value}" placeholder="e.g. *.github.com/* or github">
              <button type="button" class="btn-small btn-danger remove-condition-btn">Remove</button>
            </div>
          `).join('')}
        </div>
      `;

      builder.appendChild(groupDiv);
      addConditionGroupListeners(groupDiv);

      // Add remove group listener if it's not the first group
      if (groupIndex > 0) {
        const removeGroupBtn = groupDiv.querySelector('.remove-group-btn');
        removeGroupBtn.addEventListener('click', () => removeConditionGroup(groupDiv));
      }
    });
  } else {
    // Populate from legacy rules (create single group with OR operator for multiple patterns)
    const groupDiv = document.createElement('div');
    groupDiv.className = 'condition-group';
    groupDiv.setAttribute('data-group-id', '0');

    const conditions = [];

    // Add URL patterns
    rule.urlPatterns?.forEach(pattern => {
      conditions.push({
        type: 'url',
        value: pattern
      });
    });

    // Add title keywords
    rule.titleKeywords?.forEach(keyword => {
      conditions.push({
        type: 'title',
        value: keyword
      });
    });

    // If no conditions, add a blank one
    if (conditions.length === 0) {
      conditions.push({ type: 'url', value: '' });
    }

    // Use OR if multiple conditions, AND if just one
    const operator = conditions.length > 1 ? 'OR' : 'AND';

    groupDiv.innerHTML = `
      <div class="group-header">
        <span class="group-label">Rule Group</span>
        <select class="group-operator">
          <option value="AND" ${operator === 'AND' ? 'selected' : ''}>AND</option>
          <option value="OR" ${operator === 'OR' ? 'selected' : ''}>OR</option>
        </select>
        <button type="button" class="btn-small btn-secondary add-condition-btn">Add Condition</button>
        <button type="button" class="btn-small btn-secondary add-group-btn">Add Group</button>
      </div>
      <div class="conditions-list">
        ${conditions.map((condition, index) => `
          <div class="condition-item" data-condition-id="${index}">
            <select class="condition-type">
              <option value="url" ${condition.type === 'url' ? 'selected' : ''}>URL Pattern</option>
              <option value="title" ${condition.type === 'title' ? 'selected' : ''}>Title Keyword</option>
            </select>
            <input type="text" class="condition-value" value="${condition.value}" placeholder="e.g. *.github.com/* or github">
            <button type="button" class="btn-small btn-danger remove-condition-btn">Remove</button>
          </div>
        `).join('')}
      </div>
    `;

    builder.appendChild(groupDiv);
    addConditionGroupListeners(groupDiv);
  }

  // Update counters
  nextConditionId = builder.querySelectorAll('.condition-item').length;
  nextGroupId = builder.querySelectorAll('.condition-group').length;

  // Update preview
  updateRulePreview();
}

// Removed modal-based editing - now using form population instead

// Modal functions removed - using form population approach instead

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadSettings();
  initConditionsBuilder();
});