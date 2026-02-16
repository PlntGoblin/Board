# The Board - AI-Powered Collaborative Whiteboard

An intelligent, infinite canvas whiteboard application powered by Claude AI that allows you to create, manipulate, and organize visual elements using natural language commands. Think Miro or FigJam, but with an AI assistant that understands what you want to build.

![Version](https://img.shields.io/badge/version-0.0.0-blue.svg)
![React](https://img.shields.io/badge/react-19.2.0-blue.svg)
![Claude](https://img.shields.io/badge/Claude-Sonnet%204-purple.svg)

## Features

### 🎨 Visual Elements
- **Sticky Notes** - Colorful notes in 6 colors (yellow, pink, blue, green, purple, orange)
- **Shapes** - Rectangles and circles with custom colors
- **Frames** - Container boxes for organizing related elements

### 🤖 AI-Powered Commands
Control your board using natural language:
- **Create elements**: "Add 5 yellow sticky notes for brainstorming ideas"
- **Organize layouts**: "Arrange all sticky notes in a 3x3 grid"
- **Manipulate objects**: "Move all pink notes to the right"
- **Change properties**: "Make all sticky notes green"
- **Build templates**: "Create a SWOT analysis with 4 quadrants"
- **Delete elements**: "Remove all yellow sticky notes"

### 🖱️ Interactive Canvas
- **Infinite Pan & Zoom** - Navigate large boards with mouse/trackpad
- **Drag & Drop** - Move elements freely across the canvas
- **Grid Background** - Visual alignment guides
- **Object Selection** - Click to select with visual indicators

## Quick Start

### Prerequisites
- Node.js 16+
- An Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd the-board
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Create .env file
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
```

4. **Start the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:5173`

## Usage Examples

### Basic Commands
```
"Create a yellow sticky note that says 'User Research'"
"Add a blue rectangle at position 200, 300"
"Add a frame called 'Sprint Planning'"
```

### Layout & Organization
```
"Arrange all sticky notes in a 2x3 grid"
"Move all pink notes 300 pixels to the right"
"Space these elements evenly"
```

### Complex Templates
```
"Create a SWOT analysis with 4 frames: Strengths, Weaknesses, Opportunities, and Threats"
"Build a kanban board with 3 columns: To Do, In Progress, Done"
"Set up a retrospective board with What Went Well, What Didn't, and Action Items"
"Create a user journey map with 5 stages"
```

### Queries & Cleanup
```
"What's currently on the board?"
"Delete all yellow sticky notes"
"Clear everything except the frames"
```

## How It Works

### AI Function Calling Architecture

```
User Input (Natural Language)
        ↓
Claude AI (Analyzes & Plans)
        ↓
Tool Calls (Structured Commands)
        ↓
Board State Updates
        ↓
Visual Rendering
```

The application uses Claude's function calling capability to:
1. **Interpret** natural language commands
2. **Generate** appropriate tool calls (createStickyNote, moveObject, etc.)
3. **Execute** operations on the board
4. **Respond** with confirmation and context

### Available AI Tools

| Tool | Description | Example |
|------|-------------|---------|
| `createStickyNote` | Create colored sticky notes | "Add a yellow note" |
| `createShape` | Create rectangles or circles | "Create a blue rectangle" |
| `createFrame` | Create container frames | "Add a frame called Tasks" |
| `moveObject` | Move one or more elements | "Move all pink notes left" |
| `changeColor` | Change element colors | "Make all notes green" |
| `updateText` | Update text content | "Change the text to 'Done'" |
| `arrangeGrid` | Arrange elements in a grid | "Organize in a 3x2 grid" |
| `getBoardState` | Get current board state | Used internally by AI |
| `deleteObjects` | Delete elements | "Remove all yellow notes" |

## Technology Stack

- **Frontend Framework**: React 19.2.0
- **Build Tool**: Vite 7.3.1
- **AI Model**: Claude Sonnet 4.5 (Anthropic)
- **Icons**: Lucide React
- **Backend**: Express.js (API proxy)
- **State Management**: React Hooks

## Project Structure

```
the-board/
├── src/
│   ├── AIBoard.jsx      # Main board component
│   ├── App.jsx          # Root component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── server.js            # Express proxy server
├── package.json         # Dependencies
├── .env                 # API keys (not committed)
├── AI_EXAMPLES.md       # Detailed AI behavior examples
└── IMPLEMENTATION_GUIDE.md  # Technical implementation details
```

## Scripts

```bash
npm run dev      # Start development server (Vite)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Canvas Controls

- **Pan**: Middle-click drag OR Shift + Left-click drag
- **Zoom**: Scroll wheel
- **Select**: Left-click on element
- **Move**: Drag selected element
- **Clear Board**: Click "Clear Board" button in bottom toolbar

## Configuration

### API Settings
The application makes requests to Claude AI through a proxy server. Update `server.js` to configure:
- Port (default: 3001)
- CORS settings
- API endpoint

### Board Settings
Customize in `AIBoard.jsx`:
- Default colors
- Element sizes
- Grid spacing
- Zoom limits

## Security Notes

**Important**: This demo currently calls the Anthropic API directly from the browser. For production:

1. **Use the included proxy server** to keep API keys secure
2. **Implement rate limiting** to prevent abuse
3. **Add authentication** to protect your endpoints
4. **Validate all inputs** before processing

Update the API call in `AIBoard.jsx:311` to use the proxy:
```javascript
// Instead of:
fetch("https://api.anthropic.com/v1/messages", ...)

// Use:
fetch("http://localhost:3001/api/messages", ...)
```

## Cost Considerations

Using Claude Sonnet 4:
- ~$3 per million input tokens
- ~$15 per million output tokens
- Typical command: 500-1,000 tokens
- **Estimated cost**: $0.001 - $0.02 per command

## Roadmap

### Planned Features
- [ ] Real-time collaboration (WebSockets)
- [ ] Persistent storage (Database)
- [ ] Text editing (double-click to edit)
- [ ] Copy/paste functionality
- [ ] Undo/redo
- [ ] Export/import (JSON, PDF)
- [ ] Connectors between elements
- [ ] Image uploads
- [ ] Drawing tools
- [ ] Templates library
- [ ] Voice commands

### AI Enhancements
- [ ] Auto-organize messy boards
- [ ] Context-aware suggestions
- [ ] Template generation from descriptions
- [ ] Smart snap-to-grid
- [ ] Collaboration insights

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️ Mobile: Limited (touch events need work)

## Troubleshooting

### API Key Issues
```
Error: API request failed
```
- Check that `ANTHROPIC_API_KEY` is set in `.env`
- Verify the API key is valid at console.anthropic.com

### CORS Errors
```
Access to fetch blocked by CORS policy
```
- Make sure you're using the proxy server
- Start the proxy with `node server.js`

### Build Errors
```
Module not found
```
- Run `npm install` to ensure all dependencies are installed
- Clear `node_modules` and reinstall if needed

## Contributing

Contributions are welcome! Areas that need help:
- Mobile touch support
- Performance optimization for large boards
- Additional export formats
- More AI command patterns

## Documentation

- [AI Examples](./AI_EXAMPLES.md) - Detailed examples of AI behavior and capabilities
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Technical architecture and setup

## License

This is a demonstration project. Feel free to use, modify, and extend for your own projects.

## Acknowledgments

Built with:
- [Anthropic Claude AI](https://www.anthropic.com/) - AI-powered function calling
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Lucide Icons](https://lucide.dev/) - Icon library

---

**Made with ❤️ and AI**
