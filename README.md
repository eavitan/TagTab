# TagTab Browser Extension

A browser extension that provides OneTab-style functionality with tag organization. Save and close all your open tabs into named tags, then restore them later when needed.

## Overview

TagTab allows you to:
- Save all open tabs in the current window or all windows into a named tag
- Organize your saved tabs by categories using custom tag names
- Restore individual tabs or entire tag groups
- Replace your new tab page with a tag management interface

## Project Structure

```
tagtab-ext/
├── manifest.json          # Extension configuration and permissions
├── background.js          # Service worker handling tab operations and storage
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality and tag selection
├── popup.css              # Popup styling
├── pages.html             # Tab management page (new tab override)
├── pages.js               # Tag management functionality
├── pages.css              # Management page styling
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon32.png
    └── icon128.png
```

## Installation

### Development Installation

1. **Load as unpacked extension:**
   - Open Chrome/Edge and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `tagtab-ext` folder

2. **Verify installation:**
   - The TagTab icon should appear in your browser toolbar
   - Your new tab page should now show the TagTab interface

### Production Installation

Package the extension by creating a ZIP file of the `tagtab-ext` directory and upload to the Chrome Web Store or Edge Add-ons store.

## Usage

### Saving Tabs

1. **Using existing tags:**
   - Click the TagTab icon in the toolbar
   - Select an existing tag from the list
   - All tabs in the current window will be saved and closed

2. **Creating new tags:**
   - Click the TagTab icon in the toolbar
   - Click "+ Create new tag"
   - Enter a tag name
   - All tabs will be saved under the new tag

3. **Options:**
   - Check "Capture all windows" to save tabs from all browser windows
   - Unchecked (default): saves only tabs from the current window

### Managing Saved Tabs

1. **Access the manager:**
   - Open a new tab (automatically shows TagTab interface)
   - Or click "Manage" in the popup

2. **Restore tabs:**
   - Click individual tab links to restore single tabs
   - Click "Restore All" to open all tabs in a tag group
   - Use "Delete" to remove individual tabs from a tag

3. **Organize tags:**
   - Tags are automatically sorted alphabetically
   - Delete entire tags using the tag management controls

## Technical Details

### Permissions

- `tabs`: Required to read, create, and close browser tabs
- `storage`: Required to persist saved tabs and tag data
- `<all_urls>`: Required to access favicons and tab content

### Storage Schema

The extension uses Chrome's local storage with the following structure:

```javascript
{
  tags: {
    "tagName": [
      {
        url: "https://example.com",
        title: "Page Title",
        favIconUrl: "https://example.com/favicon.ico",
        savedAt: "2023-08-20T12:00:00.000Z"
      }
      // ... more saved tabs
    ]
    // ... more tags
  }
}
```

### Key Components

- **Service Worker (`background.js`)**: Handles all tab operations, storage management, and message passing
- **Popup Interface (`popup.js`)**: Provides quick access to save tabs to existing or new tags
- **Management Page (`pages.js`)**: Full interface for browsing and managing saved tabs
- **Manifest V3**: Uses the latest Chrome extension manifest version for security and performance

### Browser Compatibility

- Chrome (Manifest V3)
- Microsoft Edge (Chromium-based)
- Other Chromium-based browsers

## Development

### File Overview

1. **manifest.json**: Extension configuration
2. **background.js**: Core functionality and API
3. **popup.html/js/css**: Toolbar popup interface
4. **pages.html/js/css**: Full management interface
5. **icons/**: Extension icons in multiple sizes

### Testing

Test the extension by:
1. Opening multiple tabs
2. Using the popup to save them to a tag
3. Checking the new tab page to verify tabs were saved
4. Restoring individual or all tabs
5. Testing with multiple windows if needed

### Debugging

- Use Chrome DevTools on the popup and pages
- Check the service worker in `chrome://extensions/` → Details → Inspect views: service worker
- Monitor console logs for errors

## Features

- **OneTab-style functionality**: Save and close all tabs at once
- **Tag organization**: Group saved tabs by custom categories
- **Selective restoration**: Restore individual tabs or entire groups
- **New tab integration**: Replace new tab page with tag management
- **Favicon preservation**: Maintains website icons for saved tabs
- **Multi-window support**: Option to capture tabs from all windows
- **Persistent storage**: Saves data locally in the browser

## Limitations

- Does not save `chrome://` or `about:blank` pages (browser security restriction)
- Requires manual tag naming (no auto-categorization)
- Local storage only (no cloud sync)