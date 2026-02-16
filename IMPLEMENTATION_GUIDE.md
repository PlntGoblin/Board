# AI-Powered Miro-Like Board - Implementation Guide

## Overview
This is a fully functional AI-powered collaborative board similar to Miro, with an integrated AI agent that can create, manipulate, and arrange board elements through natural language commands.

## Features Implemented

### ✅ Core Canvas Functionality
- **Infinite Canvas**: Pan and zoom with mouse/trackpad
- **Drag & Drop**: Move elements freely across the board
- **Visual Grid**: Background grid for alignment
- **Object Selection**: Click to select, visual selection indicators

### ✅ AI Board Agent with 9+ Commands

#### Creation Commands ✓
1. **createStickyNote** - "Add a yellow sticky note that says 'User Research'"
2. **createShape** - "Create a blue rectangle at position 100, 200"
3. **createFrame** - "Add a frame called 'Sprint Planning'"

#### Manipulation Commands ✓
4. **moveObject** - "Move all the pink sticky notes to the right side"
5. **changeColor** - "Change the sticky note color to green"
6. **updateText** - "Update the text to say 'Completed'"

#### Layout Commands ✓
7. **arrangeGrid** - "Arrange these sticky notes in a 3x3 grid"

#### Query Commands ✓
8. **getBoardState** - Returns current board state for AI context

#### Deletion Commands ✓
9. **deleteObjects** - "Delete all yellow sticky notes"

### ✅ Complex Command Support
The AI can handle complex, multi-step commands like:
- "Create a SWOT analysis template with four quadrants"
- "Build a user journey map with 5 stages"
- "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns"

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          AI Command Input (Natural Language)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Claude API (Function Calling)           │  │
│  │  • Interprets natural language                       │  │
│  │  • Generates appropriate tool calls                  │  │
│  │  • Handles multi-step operations                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Tool Execution Layer                    │  │
│  │  • executeToolCall() function                        │  │
│  │  • Updates board state                               │  │
│  │  • Returns results to AI                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Board State Management                  │  │
│  │  • React state (boardObjects array)                  │  │
│  │  • Real-time rendering                               │  │
│  │  • Drag & drop handlers                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Canvas Rendering (React)                  │  │
│  │  • Sticky notes, shapes, frames                      │  │
│  │  • Pan/zoom transformations                          │  │
│  │  • Selection & dragging UI                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## How AI Function Calling Works

1. **User inputs natural language command**: "Create 3 yellow sticky notes for brainstorming ideas"

2. **Claude analyzes the command** and determines it needs to call `createStickyNote` 3 times

3. **AI generates tool calls**:
```json
{
  "tool_use": [
    {
      "name": "createStickyNote",
      "input": {
        "text": "Idea 1",
        "x": 100,
        "y": 100,
        "color": "yellow"
      }
    },
    // ... more calls
  ]
}
```

4. **Frontend executes each tool call** and updates the board state

5. **Results are sent back to AI** for confirmation or next steps

6. **AI responds to user** with a summary of what was done

## Tool Schema Reference

### createStickyNote
```javascript
{
  text: string,        // Note content
  x: number,          // X position
  y: number,          // Y position  
  color: "yellow" | "pink" | "blue" | "green" | "purple" | "orange"
}
```

### createShape
```javascript
{
  type: "rectangle" | "circle",
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
}
```

### createFrame
```javascript
{
  title: string,      // Frame label
  x: number,
  y: number,
  width: number,
  height: number
}
```

### moveObject
```javascript
{
  objectIds: number[],    // Array of IDs to move
  x: number,              // New X or X offset
  y: number,              // New Y or Y offset
  relative: boolean       // If true, x/y are offsets
}
```

### arrangeGrid
```javascript
{
  objectIds: number[],
  columns: number,        // Grid columns
  spacing: number,        // Space between items
  startX: number,         // Grid start position
  startY: number
}
```

### changeColor
```javascript
{
  objectIds: number[],
  color: string
}
```

### updateText
```javascript
{
  objectId: number,
  newText: string
}
```

### getBoardState
```javascript
// No parameters - returns current board state
// Used by AI to understand what's on the board
```

### deleteObjects
```javascript
{
  objectIds: number[]
}
```

## Example Commands

### Basic Creation
- "Add a yellow sticky note that says 'User Research'"
- "Create a blue rectangle at position 200, 300"
- "Add a frame called 'Sprint Planning' at 500, 200"

### Manipulation
- "Move all pink sticky notes 300 pixels to the right"
- "Change all sticky notes to green"
- "Make the first sticky note say 'Updated text'"

### Layout & Organization
- "Arrange all sticky notes in a 3x2 grid starting at 100, 100 with 50px spacing"
- "Space these elements evenly"

### Complex Multi-Step
- "Create a SWOT analysis with 4 frames: Strengths, Weaknesses, Opportunities, and Threats"
- "Build a kanban board with 3 columns: To Do, In Progress, Done"
- "Set up a retrospective board with 3 sections and add sticky notes for each"
- "Create a user journey map with 5 stages, each with a frame and sticky notes"

### Queries
- "What's currently on the board?"
- "Show me all the pink sticky notes"

### Cleanup
- "Delete all yellow sticky notes"
- "Remove the frame at the top left"

## Setup Instructions

### 1. Create a New React Project

```bash
npx create-react-app miro-ai-board
cd miro-ai-board
```

### 2. Install Dependencies

```bash
npm install lucide-react
```

### 3. Replace App.js

Copy the contents of `ai-board.jsx` into `src/App.js`

### 4. Add Tailwind (Optional, for better styling)

```bash
npm install -D tailwindcss
npx tailwindcss init
```

### 5. Run the Application

```bash
npm start
```

## Adding Real-Time Collaboration

To add multi-user collaboration like Miro, you'll need:

### WebSocket Backend
```javascript
// server.js (Node.js + Socket.io)
const io = require('socket.io')(3001, {
  cors: { origin: "*" }
});

io.on('connection', (socket) => {
  socket.on('board-update', (data) => {
    // Broadcast to all other users
    socket.broadcast.emit('board-update', data);
  });
  
  socket.on('cursor-move', (data) => {
    socket.broadcast.emit('cursor-move', { 
      ...data, 
      userId: socket.id 
    });
  });
});
```

### Frontend Integration
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// Send updates
useEffect(() => {
  socket.emit('board-update', boardObjects);
}, [boardObjects]);

// Receive updates
useEffect(() => {
  socket.on('board-update', (newObjects) => {
    setBoardObjects(newObjects);
  });
}, []);
```

## Performance Optimizations

### For Large Boards (1000+ Objects)

1. **Virtual Rendering**: Only render objects in viewport
```javascript
const visibleObjects = boardObjects.filter(obj => {
  return obj.x < viewportWidth && obj.y < viewportHeight;
});
```

2. **Canvas Instead of DOM**: Use HTML5 Canvas for better performance
```javascript
// Replace DIVs with canvas drawing
ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
```

3. **Debounce AI Calls**: Prevent too many rapid API calls
```javascript
const debouncedAI = debounce(processAICommand, 500);
```

## Security Considerations

### API Key Management
**IMPORTANT**: The current implementation sends API calls directly from the browser. For production:

1. **Use a backend proxy**:
```javascript
// Instead of calling Anthropic API directly:
fetch('https://api.anthropic.com/v1/messages', ...)

// Call your backend:
fetch('/api/ai-command', {
  method: 'POST',
  body: JSON.stringify({ command: aiInput })
})
```

2. **Implement rate limiting** to prevent abuse

3. **Add authentication** to protect your API

## Next Steps

### Immediate Enhancements
1. ✅ Add text editing on double-click
2. ✅ Implement copy/paste
3. ✅ Add undo/redo functionality
4. ✅ Export/import board state (JSON)
5. ✅ Add connectors between elements

### Advanced Features
1. Real-time collaboration (WebSocket)
2. Persistent storage (Database)
3. Templates library
4. Image uploads
5. Drawing tools (pen, highlighter)
6. Comments and reactions
7. Presentation mode
8. PDF export

### AI Enhancements
1. Voice commands
2. AI-powered suggestions
3. Auto-organize messy boards
4. Generate templates from descriptions
5. Smart snap-to-grid
6. Context-aware element creation

## Technology Stack

- **Frontend**: React 18+
- **AI**: Claude API (Anthropic)
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Styling**: Inline styles (easily replaced with Tailwind/CSS)

## Cost Considerations

Using Claude API:
- **Model**: Claude Sonnet 4 (~$3 per million input tokens, $15 per million output tokens)
- **Typical command**: 500-1000 tokens per request
- **Estimated cost**: $0.001 - $0.02 per command

For a backend proxy, consider caching common templates and responses.

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️ Mobile: Touch events need separate handling

## License & Credits

This is a demonstration project showing how to build AI-powered collaborative tools using:
- Anthropic's Claude AI with function calling
- React for the frontend
- HTML5 Canvas concepts

Feel free to use, modify, and extend for your own projects!
