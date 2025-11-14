# Claude Code Configuration

## Project Overview
TagTab is a browser extension that provides OneTab-style functionality with tag organization for managing browser tabs.

## Key Files
- `tagtab-ext/manifest.json` - Extension configuration
- `tagtab-ext/background.js` - Service worker with core functionality
- `tagtab-ext/popup.html/js/css` - Toolbar popup interface
- `tagtab-ext/pages.html/js/css` - Tab management interface
- `README.md` - Project documentation and setup instructions
- `tasks.md` - Future development roadmap and planned features

## Development Commands
- No build process required (vanilla JavaScript)
- Load extension via Chrome Developer Mode for testing
- Check service worker logs in chrome://extensions/

## Testing
- Test popup functionality with multiple open tabs
- Verify tab saving/restoration in management interface
- Test multi-window capture option
- Validate new tab page override functionality

## Recent Development Progress

### Sprint Updates (October 2024)

#### ✅ Completed Features
1. **Hierarchical Tag Organization**
   - Implemented path-based tag structure (e.g., "Development/Frontend")
   - Added tree view display with expand/collapse functionality
   - Auto-expand parent tags when selected to show child content
   - CSS styling with proper indentation for visual hierarchy

2. **Advanced Classification System**
   - Enhanced rule engine with AND/OR logical operators
   - Recursive condition groups for complex matching
   - Support for URL patterns, title keywords, and domain matching
   - Individual tag settings with inline rule management
   - Form-based rule editing (replaced modal approach)

3. **Date-Based Organization**
   - Implemented date grouping with sticky headers
   - Items sorted by date DESC within each date group
   - Improved time display showing only time for same-day items

4. **UI/UX Improvements**
   - Fixed popup display showing tag names instead of `[object Object]`
   - Added hierarchical indentation in popup interface
   - Removed special tags ("📁 All", "📂 Other") from popup for cleaner UX
   - Fixed URL overflow issues with proper text wrapping and truncation
   - Enhanced CSS styling for settings forms and tree views

5. **Sync Conditions Feature**
   - Added "Sync conditions" button to tag controls
   - Automatically imports matching pages from other tags based on classification rules
   - Supports both legacy and advanced rule structures
   - Provides user feedback on import count

#### 🔧 Bug Fixes
1. **Auto-classification Issues**
   - Fixed GitHub URL pattern matching (`*github.com/*` vs `*.github.com/*`)
   - Resolved classification engine URL pattern logic

2. **Delete Functionality**
   - Fixed delete buttons in "📁 All" virtual tag using identity-based deletion
   - Resolved delete button issues in tag settings
   - Fixed multiple tag editing causing rule deletion

3. **Display Issues**
   - Fixed tag names showing as `[object Object]` in multiple interfaces
   - Resolved child tags not appearing when parent selected
   - Fixed OR operator not saving in rule editing

4. **Data Integrity**
   - Prevented stale data issues in multi-tag editing scenarios
   - Added proper change detection and storage updates
   - Fixed sequential tag editing bugs

#### 🏗️ Technical Architecture
- Enhanced storage schema with hierarchical tag support
- Improved TagHierarchy class for managing parent-child relationships
- Added recursive item fetching for parent tags including child content
- Implemented identity-based operations using URL + timestamp
- Enhanced TabClassifier with advanced rule evaluation methods

## Future Development
See `tasks.md` for detailed roadmap including:
- Advanced rule editor with regex visualization
- Bulk tag operations and management tools
- Enhanced search and filtering capabilities
- Performance optimizations for large datasets
- Export/import functionality for tag configurations