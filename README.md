# Dark Matters - Real-Time Collaborative Whiteboard

A real-time collaborative whiteboard with an infinite canvas, multiplayer presence, and an AI assistant. Built with React, Express, and Supabase.

**Live:** [board-lilac-sigma.vercel.app](https://board-lilac-sigma.vercel.app)

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | React 19, Vite 7, React Router 7 | Vercel |
| Backend API | Node.js, Express 5 | Railway |
| Database | Supabase (PostgreSQL) | Supabase Cloud |
| Auth | Supabase Auth (email/password) | Supabase Cloud |
| Real-Time | Supabase Realtime (Broadcast + Presence) | Supabase Cloud |
| AI | Anthropic Claude API (proxied through Express) | Railway |
| Icons | Lucide React | Bundled |

### Why Supabase

Supabase is an open-source Firebase alternative built on PostgreSQL. It provides a relational database, built-in authentication, and real-time channels (broadcast + presence) out of the box -- which eliminates the need for a custom WebSocket server for multiplayer features.

## Features

### Canvas
- Infinite board with pan (Shift+drag or middle-click drag) and zoom (scroll wheel)
- Zoom presets: 50%, 100%, 150%, 200%, fit to screen
- Zoom range: 0.1x to 3x
- Grid background for visual alignment
- Dark mode / light mode toggle (persists across sessions)

### Objects
- **Sticky notes** - 6 colors (yellow, pink, blue, green, purple, orange), editable text, font size (S/M/L), bold, text alignment
- **Shapes** - Rectangle, circle, triangle, diamond, hexagon, star with customizable fill color and stroke thickness
- **Lines and arrows** - Click-drag to draw, configurable color and stroke width
- **Freehand drawing** - Pen tool with color and stroke options
- **Eraser** - Remove drawing paths by dragging over them
- **Text** - Standalone text objects, double-click to edit
- **Frames** - Container boxes for organizing related elements (used in templates)

### Object Manipulation
- Click to select, Cmd/Ctrl+click for multi-select, drag-select on empty canvas
- Drag to move (single or multi-selection)
- Resize shapes via corner handle
- Layer ordering: bring to front, bring forward, send backward, send to back
- Delete via keyboard (Delete/Backspace) or toolbar button
- Undo / redo (Cmd+Z / Cmd+Shift+Z)

### Real-Time Collaboration
- Live board sync between multiple users via Supabase Broadcast channels (150ms debounce)
- Multiplayer cursors with name labels, throttled at 50ms updates
- Presence awareness showing online users with color-coded avatars in the header
- Auto-save with status indicator (Saved / Saving / Unsaved / Save failed)

### Sharing
- Share modal with copyable board link
- Public/private visibility toggle
- Invite collaborators by email
- Public boards auto-add visitors as editors

### Authentication
- Email and password sign up / sign in via Supabase Auth
- Session persistence with auto-refresh
- Protected routes -- must be logged in to access dashboard and boards

### Dashboard
- Board listing with grid and list views
- Search boards by name
- Star/favorite boards
- Board templates: Kanban, SWOT Analysis, Brainstorm, Retrospective
- Delete boards

### AI Assistant
- Floating AI chat button on the board canvas
- Natural language commands to create, move, arrange, recolor, and delete objects
- Powered by Claude API, proxied through the Express backend to keep the API key secure

## Project Structure

```
the-board/
  src/
    AIBoard.jsx              # Main board canvas component
    App.jsx                  # Root component with routing
    main.jsx                 # Entry point
    index.css                # Global styles
    components/
      AuthModal.jsx          # Login / sign up form
      Dashboard.jsx          # Board listing and templates
      BoardCard.jsx          # Board card for grid/list view
      ShareModal.jsx         # Share and invite modal
      PresenceBar.jsx        # Online user avatars
      ProtectedRoute.jsx     # Auth route guard
    context/
      AuthContext.jsx         # Auth state provider
    hooks/
      useAuth.js             # Auth context consumer
      useBoard.js            # Board CRUD operations
      useAutoSave.js         # Debounced board saving
      useBoardSync.js        # Real-time board sync via broadcast
      usePresence.js         # Multiplayer presence and cursors
    lib/
      supabase.js            # Supabase client init
  server.js                  # Express API (boards, auth middleware, AI proxy)
  package.json
  .env.example               # Environment variable template
```

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Setup

1. Clone the repository
```bash
git clone <your-repo-url>
cd the-board
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file from the template
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`:
```
ANTHROPIC_API_KEY=your-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

5. Start the backend server
```bash
npm run server
```

6. Start the frontend dev server (in a separate terminal)
```bash
npm run dev
```

7. Open `http://localhost:5173`

### Scripts

```bash
npm run dev      # Start Vite dev server
npm run server   # Start Express backend
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Canvas Controls

| Action | Input |
|--------|-------|
| Pan | Shift + left-click drag, or middle-click drag |
| Zoom | Scroll wheel (Ctrl+scroll for trackpad pinch) |
| Select | Left-click on object |
| Multi-select | Cmd/Ctrl + click, or drag-select on empty canvas |
| Move | Drag selected object(s) |
| Edit text | Double-click sticky note or text object |
| Delete | Select + Delete/Backspace key, or toolbar trash button |
| Undo | Cmd/Ctrl + Z |
| Redo | Cmd/Ctrl + Shift + Z |

## Deployment

- **Frontend (Vercel):** Connect your repo to Vercel. Set the `VITE_` environment variables in the Vercel dashboard.
- **Backend (Railway):** Deploy `server.js` to Railway. Set all non-`VITE_` environment variables plus `FRONTEND_URL` (your Vercel URL) for CORS.
- **Database (Supabase):** Boards and collaborators tables in PostgreSQL. Realtime enabled for broadcast and presence channels.

## License

This is a demonstration project. Feel free to use, modify, and extend.

## Acknowledgments

Built with [React](https://react.dev/), [Vite](https://vitejs.dev/), [Express](https://expressjs.com/), [Supabase](https://supabase.com/), [Anthropic Claude](https://www.anthropic.com/), and [Lucide Icons](https://lucide.dev/).
