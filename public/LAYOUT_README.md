# Inspedia - New Layout System

## Overview
The app now uses a consistent layout structure across all pages with a new welcome/session creation flow.

## File Structure

```
inspedia/
├── welcome.html          # Welcome page with session creation
├── discovery.html        # Idea discovery feed
├── collection.html       # Saved ideas collection
├── workbench.html        # Brainstorming workspace
├── layout.css            # Shared layout styles
├── app.js                # Main application logic
├── ui.js                 # UI rendering functions
├── api.js                # API integration
└── toon-lib.js          # TOON format library
```

## Layout Components

### 1. Header
- Logo centered
- Optional back button (left side)
- Background: `#303030`

### 2. Main Content
- Flexible scrollable area
- Padding: `1.5rem`
- Background: `#303030`

### 3. Bottom Navigation
- 4 navigation icons:
  - Discovery (card stack icon)
  - Collection (bookmark icon)
  - Workbench (chat icon)
  - Profile (user icon)
- Background: `#272727`
- Active state with opacity change

## Color Palette

```css
--bg-primary: #303030;
--bg-secondary: #272727;
--bg-card: #404040;
--bg-hover: #4a4a4a;
--text-primary: #ffffff;
--text-secondary: #e5e5e5;
--text-muted: #a5a5a5;
--accent: #FDFF98;
```

## User Flow

### Session Creation (welcome.html)
1. User lands on welcome page
2. Selects one or more categories OR enters custom topic
3. Clicks "Find My Next Idea" button
4. Session data is saved to localStorage
5. Redirected to discovery.html

### Discovery Flow (discovery.html)
1. AI generates idea based on session data
2. User can:
   - Pin idea to collection
   - Skip to next idea
3. Auto-loads next idea after pin

### Collection Flow (collection.html)
1. Shows all pinned ideas (newest first)
2. User can select multiple ideas
3. Click "Synthesize" to combine ideas
4. Redirects to workbench

### Workbench Flow (workbench.html)
1. Shows selected ideas as context
2. AI-powered chat to refine concept
3. Save final synthesized idea back to collection

## Session Data Structure

```javascript
{
  "categories": ["AI", "Developer Tools"],
  "customTopic": "",
  "timestamp": "2025-11-02T10:30:00.000Z"
}
```

## Idea Data Structure

```javascript
{
  "id": "uuid",
  "title": "Idea Title",
  "summary": "Brief description",
  "tags": ["tag1", "tag2"],
  "source": "From Hacker News",
  "sources": [
    {
      "title": "Article Title",
      "url": "https://..."
    }
  ],
  "createdAt": "2025-11-02T10:30:00.000Z"
}
```

## Responsive Design

- Mobile-first approach
- Max-width: `28rem` (448px) on desktop
- Centered container
- Touch-friendly buttons (min-height: 44px)

## Browser Support

- Modern browsers with ES6 module support
- CSS Grid and Flexbox
- CSS Custom Properties

## Next Steps

1. Integrate actual API calls in discovery.html
2. Create collection.html with grid layout
3. Create workbench.html with chat interface
4. Add profile.html for user settings
5. Implement API key management modal
