# Popup Integration Requirements

The new popup design requires these message handlers to be added to `background.js`:

## New Message Types Needed:

### 1. `saveSpecificTabs`
```javascript
{
  type: "saveSpecificTabs",
  tag: "Development",
  tabIds: [123, 456, 789]
}
```
**Purpose**: Save only specific tabs by their IDs to a tag.
**Response**: `{ ok: true, saved: number }`

### 2. `addUrlPatternRule`
```javascript
{
  type: "addUrlPatternRule",
  tag: "Development",
  pattern: "*github.com*"
}
```
**Purpose**: Add a URL pattern rule to a tag's classification system.
**Response**: `{ ok: true }` or `{ ok: false, error: string }`

## Implementation Notes:

1. **saveSpecificTabs**: Should reuse existing tab saving logic but filter to only specified tab IDs
2. **addUrlPatternRule**: Should integrate with the existing classification rule system
3. Both should maintain compatibility with existing hierarchical tag structure
4. Error handling should provide meaningful feedback to the popup

## Quick Action Summary:

- **This**: Save current tab only (`saveSpecificTabs` with single tab)
- **All**: Save all tabs (existing `saveAndClose` functionality)
- **Domain**: Save all tabs from same domain (`saveSpecificTabs` with domain-filtered tabs)
- **Regex**: Add URL pattern rule (`addUrlPatternRule` for auto-classification)

## Future Integration:

These handlers should be merged with the existing classification system when ready.