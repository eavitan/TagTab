# TagTab Extension - Future Development Tasks

## Phase 1: Automatic Tab Classification

### 1.1 Smart Tab Classification System
- **Goal**: Automatically classify tabs when closed based on URL patterns or title keywords
- **Implementation**:
  - Add classification rules engine to `background.js`
  - Create URL pattern matching (e.g., `*.github.com` → "Development")
  - Add title keyword detection (e.g., "documentation", "tutorial" → "Learning")
  - Store classification rules in extension storage

### 1.2 Tag Settings & Configuration
- **Goal**: Add settings/configuration for each tag
- **Features**:
  - Tag icons/colors for visual distinction
  - Classification rules per tag (URL patterns, title keywords)
  - Tag-specific behavior settings
- **Implementation**:
  - Add settings icon/button to each tag in management interface
  - Create tag settings modal/page
  - Extend storage schema to include tag metadata

### 1.3 Main Settings Page
- **Goal**: Central configuration for tag management and classification
- **Features**:
  - Global classification rules
  - Tag creation templates
  - Import/export tag configurations
  - Split tab handling preferences
  - **Restore behavior settings**:
    - Default restore mode: "Restore and close" vs "Restore and keep"
    - "Restore today" option (restore only tabs saved today)
  - **Page behavior settings**:
    - Toggle TagTab as default new tab page (enable/disable override)
    - Option to set TagTab as browser start page
    - Custom homepage URL configuration
- **Implementation**:
  - Create new settings page (`settings.html/js/css`)
  - Add settings link to main interface
  - Implement settings persistence
  - Add restore behavior controls to management interface
  - Add manifest permission toggle for new tab override
  - Implement start page configuration options

## Phase 2: Advanced Tag Management

### 2.1 Multi-Tag Classification
- **Goal**: Handle tabs that match multiple tag criteria
- **Features**:
  - Split tab functionality - duplicate tab to multiple matching tags
  - Priority system for tag selection
  - User prompt for manual tag selection when conflicts arise
- **Implementation**:
  - Add conflict resolution logic to classification engine
  - Create UI for handling multi-tag scenarios
  - Add user preferences for automatic vs manual resolution

### 2.2 Hierarchical Tags (Sub Tags)
- **Goal**: Allow nested tag organization with drag and drop functionality
- **Features**:
  - Create sub tags under parent tags (e.g., "Development" → "Frontend", "Backend")
  - Drag and drop interface for organizing tag hierarchy
  - Drag tabs between parent and sub tags
  - Collapsible/expandable tag tree view
  - Breadcrumb navigation for deep hierarchies
- **Implementation**:
  - Extend storage schema to support parent-child relationships
  - Add drag and drop event handlers to tag management interface
  - Create tree view component for hierarchical display
  - Update classification engine to support sub tag targeting
  - Add visual indicators for parent/child relationships

### 2.3 Special Tag Categories

#### 2.3.1 "All" Tag
- **Goal**: Virtual tag showing all saved tabs across all categories
- **Features**:
  - Consolidated view of all saved tabs
  - Search and filter functionality
  - Bulk operations across all tags
- **Implementation**:
  - Add virtual tag handling to tag listing
  - Modify data retrieval to aggregate all tabs
  - Add filtering and search UI

#### 2.3.2 "Other" Tag
- **Goal**: Catch-all tag for tabs that don't match any classification rules
- **Features**:
  - Automatic assignment for unclassified tabs
  - Easy reclassification to proper tags
  - Suggestion engine for creating new tags
- **Implementation**:
  - Add fallback classification logic
  - Create reclassification interface
  - Implement tag suggestion algorithm

## Phase 3: Enhanced User Experience

### 3.1 Enhanced Restore Options
- **Goal**: Flexible tab restoration behaviors
- **Features**:
  - **Restore and close**: Remove tab from saved list after opening (current behavior)
  - **Restore and keep**: Keep tab in saved list after opening
  - **Restore today**: Filter and restore only tabs saved today
  - Per-tag restore behavior preferences
  - Bulk restore with behavior selection
- **Implementation**:
  - Add restore mode parameter to restore functions
  - Modify UI to show restore behavior options
  - Add date filtering for "restore today" feature
  - Update storage schema to track restore preferences

### 3.2 Tag Analytics
- **Goal**: Provide insights into tab usage patterns
- **Features**:
  - Most saved/restored tags
  - Tab accumulation trends
  - Usage statistics dashboard

### 3.3 Search & Filter
- **Goal**: Advanced search capabilities across all saved tabs
- **Features**:
  - Full-text search in titles and URLs
  - Date range filtering
  - Tag-based filtering
  - Saved search queries

### 3.4 Import/Export
- **Goal**: Data portability and backup
- **Features**:
  - Export tags to JSON/CSV
  - Import from other tab managers
  - Backup/restore functionality
  - Sync between browser instances

## Implementation Priority

1. **High Priority**:
   - ~~Tag settings & configuration (1.2)~~ - **DONE** ✅
   - ~~"All" and "Other" special tags (2.3)~~ - **DONE** ✅
   - ~~Basic tab classification (1.1)~~ - **DONE** ✅
   - ~~Hierarchical tags with drag and drop (2.2)~~ - **DONE** ✅ (Phase 1: Tree View)
   - Enhanced restore options (3.1)

2. **Medium Priority**:
   - ~~Main settings page (1.3)~~ - **DONE** ✅
   - Multi-tag classification (2.1)
   - Search & filter (3.3)

3. **Low Priority**:
   - Tag analytics (3.2)
   - Import/export (3.4)

## Phase 2: Advanced Features (Future Development)

### **Classification System Enhancements**

#### **4.1 Advanced Rule Editor Interface**
- **Goal**: Replace popup-based rule editing with integrated form interface
- **Features**:
  - In-page rule editor instead of browser prompts
  - Real-time rule validation and preview
  - Better UX for managing complex rules
- **Implementation**:
  - Create dedicated rule editor component in settings page
  - Add inline editing for rules directly in classification tab
  - Remove dependency on browser alert/prompt dialogs

#### **4.2 Advanced Logical Conditions (AND/OR Functionality)**
- **Goal**: Support complex rule logic with multiple conditions
- **Features**:
  - **AND conditions**: `site:portuguese.pt AND keyword:tutorial`
  - **OR conditions**: `domain:en.com OR domain:us.org`
  - **Mixed logic**: `(site:portuguese.pt AND keyword:tutorial) OR (site:english.com AND keyword:guide)`
  - **Multiple condition types**:
    - Domain conditions: `domain:example.com`
    - URL path conditions: `path:/tutorials/`
    - Title conditions: `title:contains(word)`
    - Content conditions: `content:matches(pattern)`
- **Implementation**:
  - Extend classification engine to support logical operators
  - Create visual rule builder with drag-and-drop conditions
  - Add condition validation and testing interface
  - Support grouping with parentheses for complex logic

#### **4.3 Real-time Regex Pattern Matching Display**
- **Goal**: Show live regex matches for debugging and optimization
- **Features**:
  - "Advanced Display" button near "Restore all" / "Delete tag"
  - Toggle to show regex match highlights in item listings
  - Display which specific pattern matched each item
  - Show match confidence scores and reasoning
  - Visual indicators for different match types (URL, title, content)
- **Implementation**:
  - Add pattern match metadata to saved items
  - Create highlighting system for matched text
  - Add toggle button in tag view controls
  - Display match information in item metadata

#### **4.4 Optimized Rule Performance**
- **Goal**: Improve rule insertion, update, and matching performance
- **Features**:
  - Batch rule operations for multiple updates
  - Optimized regex compilation and caching
  - Smart rule ordering for faster matching
  - Background processing for large rule sets
- **Implementation**:
  - Implement rule change batching system
  - Add regex compilation caching
  - Optimize rule evaluation order
  - Add performance monitoring and metrics

### **Tag Management Enhancements**

#### **4.5 Advanced Tag Controls**
- **Goal**: Enhanced tag management interface with powerful operations
- **Features**:
  - **"Sync Condition" button**: Apply current tag's classification rules to import/remove items from other tags
  - **Advanced filtering**: Show only items matching specific conditions
  - **Bulk operations**: Apply actions to multiple items based on rules
  - **Tag templates**: Save and reuse common tag configurations
- **Implementation**:
  - Add "Sync Condition" button to tag controls
  - Create cross-tag item migration system
  - Implement condition-based filtering interface
  - Add bulk selection and operation tools

#### **4.6 Smart Tag Synchronization**
- **Goal**: Intelligent content organization across tags
- **Features**:
  - **Auto-sync**: Continuously apply rules to reorganize content
  - **Conflict resolution**: Handle items matching multiple tag conditions
  - **Sync history**: Track items moved between tags
  - **Manual override**: Allow users to pin items to specific tags
- **Implementation**:
  - Create background sync service
  - Add conflict resolution UI
  - Implement sync history tracking
  - Add item pinning/locking mechanism

### **User Interface Improvements**

#### **4.7 Enhanced Rule Builder Interface**
- **Goal**: Visual, user-friendly rule creation and editing
- **Features**:
  - **Visual condition builder**: Drag-and-drop interface for creating rules
  - **Rule templates**: Pre-built rules for common scenarios
  - **Testing sandbox**: Test rules against existing items before applying
  - **Import/export rules**: Share rule sets between users
- **Implementation**:
  - Create visual rule builder component
  - Add rule template library
  - Implement rule testing interface
  - Add rule import/export functionality

#### **4.8 Advanced Display Options**
- **Goal**: Flexible viewing and debugging options
- **Features**:
  - **Match visualization**: Highlight why items matched specific rules
  - **Rule coverage**: Show which rules are most/least effective
  - **Performance metrics**: Display rule processing times
  - **Debug mode**: Detailed logging for troubleshooting
- **Implementation**:
  - Add match highlighting system
  - Create rule analytics dashboard
  - Implement performance monitoring
  - Add debug logging interface

## Implementation Priority (Future Phases)

1. **Phase 2A - Immediate Improvements**:
   - Advanced Rule Editor Interface (4.1)
   - Advanced Tag Controls (4.5)
   - Real-time Regex Pattern Matching Display (4.3)
   - Drag and Drop Tag Reorganization (4.9)

#### **4.9 Drag and Drop Tag Reorganization**
- **Goal**: Enable drag and drop functionality for reorganizing tag hierarchy
- **Features**:
  - Drag tags to reorder within same level
  - Drag tags to move between hierarchy levels
  - Drag tabs between tags
  - Visual feedback during drag operations
  - Touch support for mobile devices
- **Implementation**:
  - Add HTML5 drag and drop API to tag elements
  - Implement drop zones and visual feedback
  - Update storage when tags are reorganized
  - Add conflict resolution for drag operations

2. **Phase 2B - Complex Logic**:
   - Advanced Logical Conditions (4.2)
   - Smart Tag Synchronization (4.6)
   - Optimized Rule Performance (4.4)

3. **Phase 2C - Advanced UX**:
   - Enhanced Rule Builder Interface (4.7)
   - Advanced Display Options (4.8)

## Technical Considerations

- **Storage Schema Changes**: Will need to extend current storage to include tag metadata, classification rules, and hierarchical relationships
- **Performance**: Classification engine should be efficient for real-time tab processing
- **UI/UX**: Maintain simple, intuitive interface while adding advanced features like drag and drop
- **Backward Compatibility**: Ensure existing saved tags continue to work with new features
- **Manifest Permissions**: Currently uses `chrome_url_overrides.newtab` - need dynamic control for enabling/disabling this feature
- **Browser API Limitations**: New tab override requires manifest declaration, may need alternative approaches for runtime toggling

## File Structure Changes

```
tagtab-ext/
├── background.js          # Add classification engine
├── pages.js              # Add "All"/"Other" tag handling
├── settings.html         # New settings page
├── settings.js           # Settings management
├── settings.css          # Settings styling
├── classifier.js         # New classification logic module
└── utils.js              # Shared utility functions
```