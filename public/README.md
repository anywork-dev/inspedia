# Idea Foundry 💡

An AI-powered application for discovering, curating, and developing ideas through an intuitive card-based interface and powerful AI brainstorming assistant.

## Features

### 🎴 The Deck - Discovery
- Discover AI-generated ideas presented as individual cards
- Each card shows: title, summary, tags, and source
- Generate new ideas with the "Next Idea" button
- Save interesting ideas to your collection with the "Pin" button

### 📚 The Collection - Curation
- View all your pinned ideas in a beautiful grid layout
- Select one or more cards to brainstorm with
- Cards show rich information with tags and metadata
- Empty state guidance when no ideas are saved

### 🔧 The Workbench - Development
- AI-powered brainstorming session with selected ideas
- Chat interface for interactive discussion
- Context cards displayed for reference
- Save refined ideas back to your collection

## Technical Specifications

### TOON Format Integration
All data exchanged with the AI uses the TOON (Token-Oriented Object Notation) specification:
- **Library**: `@toon-format/toon` v0.7.0
- **Encoding**: `toon.encode()` before sending to AI
- **Decoding**: `toon.decode()` when receiving from AI

### Data Model
```javascript
{
  "id": "uuid-1234",
  "title": "AI-Powered Garden Planning",
  "summary": "An app that uses AI to plan a garden based on climate and space.",
  "tags": ["AI", "Gardening", "Mobile"],
  "source": "Initial Generation" | "From Brainstorm"
}
```

### Local Storage
- API keys stored in `localStorage` (`gemini_api_key`)
- Pinned cards stored in `localStorage` (`pinned_cards`)
- All data persists between sessions

### AI Interaction Patterns

**Initial Card Generation (The Deck)**
- AI generates ideas in TOON format: `cards[1]{id,title,summary,tags,source}:`
- Source set to "Initial Generation"

**Brainstorming Session (The Workbench)**
- Context sent to AI in TOON format
- Discussion happens in plain text
- Maintains conversation history

**Saving Brainstormed Ideas**
- AI summarizes entire discussion
- Returns new card in TOON format
- Source set to "From Brainstorm"

## Getting Started

1. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Generate your API key

2. **Open the Application**
   - Open `index.html` in a modern web browser
   - Enter your API key when prompted

3. **Start Discovering**
   - Click "Next Idea" to generate new ideas
   - Pin ideas you find interesting
   - Build your collection

4. **Brainstorm**
   - Navigate to your Collection
   - Select one or more ideas
   - Click "Brainstorm with Selected"
   - Discuss with AI and save refined ideas

## Architecture

- **Single-file Application**: All code in `index.html`
- **No Build Process**: Pure HTML, CSS, and JavaScript
- **ES Modules**: Uses modern JavaScript module imports
- **Embedded CSS**: Complete styling without external dependencies
- **TOON Library**: Imported from `toon-lib.js`

## Browser Compatibility

- Modern browsers with ES6+ support
- JavaScript modules support required
- LocalStorage enabled
- Internet connection for AI API calls

## Security

- API keys stored locally in browser
- No server-side data collection
- All data stays in your browser
- HTTPS recommended for production use