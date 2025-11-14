# Hierarchical Tags Design Document

## 🎯 **Goal**
Implement nested tag organization with drag & drop functionality, allowing users to create sub-tags under parent tags with a tree view interface.

## 📊 **Storage Schema Design**

### **Current Schema:**
```javascript
{
  tags: {
    "Development": [...items],
    "Learning": [...items],
    "Other": [...items]
  }
}
```

### **New Hierarchical Schema:**
```javascript
{
  tags: {
    "Development": [...items],
    "Development/Frontend": [...items],
    "Development/Backend": [...items],
    "Development/DevOps": [...items],
    "Learning": [...items],
    "Learning/JavaScript": [...items],
    "Learning/Design": [...items],
    "Other": [...items]
  },
  tagHierarchy: {
    "Development": {
      parent: null,
      children: ["Development/Frontend", "Development/Backend", "Development/DevOps"],
      collapsed: false
    },
    "Development/Frontend": {
      parent: "Development",
      children: [],
      collapsed: false
    },
    "Development/Backend": {
      parent: "Development",
      children: [],
      collapsed: false
    },
    "Learning": {
      parent: null,
      children: ["Learning/JavaScript", "Learning/Design"],
      collapsed: false
    }
  }
}
```

## 🏗 **Implementation Strategy**

### **Phase 1: Storage & Backend**
1. **Path-based naming**: Use "/" separator (e.g., "Development/Frontend")
2. **Hierarchy metadata**: Track parent-child relationships
3. **Backward compatibility**: Existing tags become root-level parents

### **Phase 2: Tree View UI**
1. **Collapsible tree**: Expand/collapse parent tags
2. **Visual hierarchy**: Indentation and tree lines
3. **Tag management**: Create, rename, delete with hierarchy

### **Phase 3: Drag & Drop**
1. **Drag tags**: Reorder and reorganize hierarchy
2. **Drag items**: Move tabs between parent and sub-tags
3. **Drop zones**: Visual feedback during dragging

### **Phase 4: Enhanced Features**
1. **Breadcrumbs**: Navigation for deep hierarchies
2. **Auto-classification**: Route to specific sub-tags
3. **Bulk operations**: Actions on entire branches

## 🎨 **UI Design**

### **Tree View Structure:**
```
📁 All
📂 Other
📁 Development [12 items] ⯆
├── 📁 Frontend [5 items]
├── 📁 Backend [4 items]
└── 📁 DevOps [3 items]
📁 Learning [8 items] ⯈
📁 Shopping [2 items]
```

### **Features:**
- **Expand/Collapse**: Click arrow to show/hide children
- **Item counts**: Show total items in each tag
- **Drag handles**: Visual indicators for draggable elements
- **Drop zones**: Highlight valid drop targets
- **Context menus**: Right-click for tag operations

## 🔧 **Technical Considerations**

### **Tag Path Management:**
- **Separator**: "/" for cross-platform compatibility
- **Validation**: Prevent circular references
- **Uniqueness**: Full paths must be unique

### **Drag & Drop API:**
- **HTML5 Drag & Drop**: Native browser API
- **Data transfer**: Tag IDs and hierarchy info
- **Event handling**: dragstart, dragover, drop events

### **Performance:**
- **Lazy loading**: Load sub-tags on demand
- **Virtual scrolling**: Handle large hierarchies
- **Debounced updates**: Batch hierarchy changes

## 📱 **User Experience**

### **Creating Sub-tags:**
1. Right-click parent tag → "Add sub-tag"
2. Drag existing tag onto parent
3. Use breadcrumb navigation

### **Moving Items:**
1. Drag tab from one tag to another
2. Bulk select and move multiple tabs
3. Move between parent and child tags

### **Visual Feedback:**
1. Highlight drop zones during drag
2. Show hierarchy depth with indentation
3. Animate expand/collapse transitions

## 🔄 **Migration Strategy**

### **Backward Compatibility:**
1. Existing tags become root-level tags
2. No data loss during upgrade
3. Gradual migration as users organize

### **Default Hierarchy:**
```
Development/
├── Frontend
├── Backend
└── DevOps

Learning/
├── Tutorials
└── Documentation

Work/
├── Projects
└── Meetings
```

This design provides a solid foundation for implementing hierarchical tags with full drag & drop support while maintaining backward compatibility.