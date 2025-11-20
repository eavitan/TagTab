<div align="center">

<img src="https://eyal.cc/wp-content/uploads/2025/11/tagtab-logo.png" alt="TagTab Logo" width="100"/>

# TagTab - Organize your tabs for once!

**Transform tab chaos into organized productivity**

<img src="https://eyal.cc/wp-content/uploads/2025/11/tagtab-cover-1.png" alt="TagTab Cover" width="100%"/>

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available%20Soon-brightgreen)](https://chrome.google.com/webstore)
[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red)]()
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)

*Group tabs by project, save workflows, and switch between tasks effortlessly.*

</div>

## ✨ What is TagTab?

TagTab is a powerful browser extension that transforms how you manage tabs. Like OneTab but with advanced organization features, TagTab lets you:

🏷️ **Save & Organize** - Group tabs by project, topic, or workflow
🔄 **Quick Restore** - Get back to your saved work instantly
🎯 **Stay Focused** - Reduce tab clutter and browser memory usage
🌙 **Dark Theme** - Beautiful interface that works day or night
🤖 **Auto-Classification** - Smart rules to organize tabs automatically

## 🚀 Key Features

- **📁 Hierarchical Tags** - Create nested tag structures for complex organization
- **🔍 Smart Classification** - Auto-classify tabs based on URL patterns and titles
- **⚡ Quick Access** - Save tabs with one click from the browser toolbar
- **🔄 Flexible Restore** - Restore individual tabs or entire groups
- **🆕 New Tab Override** - Replace new tab page with your tag manager
- **💾 Local Storage** - Keep your data private and secure
- **🎨 Modern UI** - Clean, intuitive interface with dark theme support

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

## 📥 Installation

### Chrome Web Store (Recommended)
*Coming soon! The extension is being reviewed for publication.*

### Manual Installation (Development)

1. **Download the Extension**
   - Download or clone this repository
   - Navigate to the `tagtab-ext` folder

2. **Load in Chrome/Edge**
   - Open `chrome://extensions/` in your browser
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `tagtab-ext` folder

3. **You're Ready!**
   - TagTab icon appears in your toolbar
   - New tab page is replaced with TagTab interface

## 🎯 How to Use

### 💾 Saving Tabs

<details>
<summary><strong>🆕 Create New Tag</strong></summary>

1. Click the TagTab icon in your toolbar
2. Click **"+ Create new tag"**
3. Enter a descriptive name (e.g. "Research Project", "Shopping")
4. Your tabs are instantly saved and organized!

</details>

<details>
<summary><strong>📁 Save to Existing Tag</strong></summary>

1. Click the TagTab icon
2. Choose from your existing tags
3. Tabs are added to the selected category
4. Option: Check **"Capture all windows"** to save tabs from all browser windows

</details>

<details>
<summary><strong>🤖 Auto-Classification</strong></summary>

1. Set up classification rules in Settings
2. Create patterns like `*github.com*` for development tabs
3. Use the **"Auto-classify tabs"** button
4. Watch as tabs organize themselves automatically!

</details>

### 🔄 Managing Your Tabs

<details>
<summary><strong>📂 Browse Your Collection</strong></summary>

- **New Tab Page**: Automatically shows your TagTab manager
- **Or Click "Manage"** in the popup for quick access
- **Hierarchical View**: See parent/child tag relationships

</details>

<details>
<summary><strong>⚡ Restore & Access</strong></summary>

- **Single Tab**: Click any tab to restore it instantly
- **Restore All**: Open entire tag groups at once
- **Individual Settings**: Configure restore behavior per tab

</details>

<details>
<summary><strong>🎛️ Organize & Customize</strong></summary>

- **Delete Individual Tabs**: Remove items you no longer need
- **Tag Management**: Create, edit, and delete tag groups
- **Classification Rules**: Set up smart auto-organization
- **Dark/Light Theme**: Match your browser preferences

</details>

## 🛠️ Technical Details

### Browser Compatibility
- ✅ **Chrome** (Recommended)
- ✅ **Microsoft Edge** (Chromium-based)
- ✅ **Brave Browser**
- ✅ **Other Chromium browsers**

### Privacy & Security
- 🔒 **Local Storage Only** - Your data never leaves your browser
- 🚫 **No Cloud Sync** - Complete privacy protection
- ⚡ **Manifest V3** - Latest security standards
- 🛡️ **Minimal Permissions** - Only what's needed for functionality

### Required Permissions
- **`tabs`** - Read, create, and close browser tabs
- **`storage`** - Store your saved tabs locally
- **`activeTab`** - Access current tab for saving

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

---

<div align="center">

## 💝 Made with Love

**TagTab** is crafted with care to make your browsing experience more organized and productive.

[⭐ Star this project](https://github.com/eavitan/TagTab) • [🐛 Report Issues](https://github.com/eavitan/TagTab/issues) • [💡 Feature Requests](https://github.com/eavitan/TagTab/issues)

### 🚀 Coming Soon
- **Cloud Sync** - Access your tags across devices
- **Smart Suggestions** - AI-powered tag recommendations
- **Team Sharing** - Collaborate on tag collections
- **Import/Export** - Backup and restore your data

---

**Transform your browsing workflow today with TagTab!**

*No more tab chaos. No more lost work. Just organized productivity.*

</div>