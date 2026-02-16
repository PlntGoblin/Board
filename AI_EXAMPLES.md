# AI Board Agent - Example Commands & Behaviors

## How the AI Agent Works

The AI Board Agent uses Claude's function calling capability to translate natural language into specific board operations. The AI can:
1. **Understand context** from the current board state
2. **Plan multi-step operations** (e.g., create template = create frames + sticky notes)
3. **Handle vague requests** by making reasonable assumptions
4. **Execute multiple operations** in sequence

---

## Example Command Scenarios

### 1. Simple Creation Commands

#### Command: "Add a yellow sticky note that says 'User Research'"
**AI Actions:**
```json
{
  "tool": "createStickyNote",
  "input": {
    "text": "User Research",
    "x": 200,
    "y": 200,
    "color": "yellow"
  }
}
```
**Result:** Single yellow sticky note created at (200, 200)

---

#### Command: "Create a blue rectangle at position 100, 200"
**AI Actions:**
```json
{
  "tool": "createShape",
  "input": {
    "type": "rectangle",
    "x": 100,
    "y": 200,
    "width": 150,
    "height": 100,
    "color": "blue"
  }
}
```
**Result:** Blue rectangle created at specified position

---

### 2. Manipulation Commands

#### Command: "Move all the pink sticky notes to the right side"
**AI Actions:**
1. First calls `getBoardState` to see what's on the board
2. Identifies all pink sticky notes (let's say IDs: 3, 5, 8)
3. Calls `moveObject`:
```json
{
  "tool": "moveObject",
  "input": {
    "objectIds": [3, 5, 8],
    "x": 1200,
    "y": 0,
    "relative": false
  }
}
```
**Result:** All pink notes moved to x=1200

---

#### Command: "Change all sticky notes to green"
**AI Actions:**
1. Calls `getBoardState`
2. Finds all objects with type "stickyNote" (IDs: 1, 2, 3, 4, 5)
3. Calls `changeColor`:
```json
{
  "tool": "changeColor",
  "input": {
    "objectIds": [1, 2, 3, 4, 5],
    "color": "green"
  }
}
```
**Result:** All sticky notes now green

---

### 3. Layout Commands

#### Command: "Arrange these sticky notes in a 3x3 grid"
**AI Actions:**
1. Calls `getBoardState` to get all sticky notes
2. Takes first 9 sticky notes (or all if less than 9)
3. Calls `arrangeGrid`:
```json
{
  "tool": "arrangeGrid",
  "input": {
    "objectIds": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "columns": 3,
    "spacing": 50,
    "startX": 100,
    "startY": 100
  }
}
```
**Result:** 9 sticky notes arranged in 3x3 grid with 50px spacing

---

#### Command: "Create a 2x3 grid of sticky notes for pros and cons"
**AI Actions:**
Multiple tool calls in sequence:
1. `createStickyNote` - "Pro 1" (yellow)
2. `createStickyNote` - "Pro 2" (yellow)
3. `createStickyNote` - "Pro 3" (yellow)
4. `createStickyNote` - "Con 1" (pink)
5. `createStickyNote` - "Con 2" (pink)
6. `createStickyNote` - "Con 3" (pink)
7. `arrangeGrid` with objectIds of all 6 notes
**Result:** 2x3 grid with pros (yellow) and cons (pink)

---

### 4. Complex Multi-Step Commands

#### Command: "Create a SWOT analysis template with four quadrants"
**AI Execution Plan:**
1. Create 4 frames for each quadrant
2. Add sticky notes as placeholders in each
3. Position everything in a 2x2 layout

**Tool Calls:**
```javascript
// Frame 1: Strengths
createFrame({ 
  title: "Strengths", 
  x: 100, y: 100, 
  width: 400, height: 350 
})

// Frame 2: Weaknesses
createFrame({ 
  title: "Weaknesses", 
  x: 550, y: 100, 
  width: 400, height: 350 
})

// Frame 3: Opportunities
createFrame({ 
  title: "Opportunities", 
  x: 100, y: 500, 
  width: 400, height: 350 
})

// Frame 4: Threats
createFrame({ 
  title: "Threats", 
  x: 550, y: 500, 
  width: 400, height: 350 
})

// Add placeholder notes in each frame
createStickyNote({ text: "Add strengths here...", x: 150, y: 150, color: "green" })
createStickyNote({ text: "Add weaknesses here...", x: 600, y: 150, color: "pink" })
createStickyNote({ text: "Add opportunities here...", x: 150, y: 550, color: "blue" })
createStickyNote({ text: "Add threats here...", x: 600, y: 550, color: "orange" })
```

**Result:** Complete SWOT analysis board ready to use

---

#### Command: "Build a user journey map with 5 stages"
**AI Execution:**
```javascript
// Create 5 frames for stages
const stages = ["Awareness", "Consideration", "Purchase", "Retention", "Advocacy"];
stages.forEach((stage, i) => {
  createFrame({
    title: stage,
    x: 100 + (i * 320),
    y: 100,
    width: 280,
    height: 600
  });
  
  // Add sticky notes for each stage
  createStickyNote({ 
    text: `${stage} - User actions`, 
    x: 120 + (i * 320), 
    y: 150, 
    color: "yellow" 
  });
  
  createStickyNote({ 
    text: `${stage} - Pain points`, 
    x: 120 + (i * 320), 
    y: 380, 
    color: "pink" 
  });
  
  createStickyNote({ 
    text: `${stage} - Opportunities`, 
    x: 120 + (i * 320), 
    y: 510, 
    color: "green" 
  });
});
```

**Result:** 5 vertical columns with frames and categorized sticky notes

---

#### Command: "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns"
**AI Execution:**
```javascript
// Create 3 column frames
createFrame({ title: "What Went Well ✅", x: 100, y: 100, width: 400, height: 700 })
createFrame({ title: "What Didn't Go Well ❌", x: 550, y: 100, width: 400, height: 700 })
createFrame({ title: "Action Items 🎯", x: 1000, y: 100, width: 400, height: 700 })

// Add initial sticky notes
createStickyNote({ text: "Add positive feedback...", x: 150, y: 150, color: "green" })
createStickyNote({ text: "What could improve?", x: 600, y: 150, color: "pink" })
createStickyNote({ text: "Next steps...", x: 1050, y: 150, color: "blue" })
```

**Result:** Ready-to-use retrospective board

---

### 5. Smart Context-Aware Commands

#### Command: "Add 5 more ideas" (when sticky notes already exist)
**AI Behavior:**
1. Calls `getBoardState` to see existing notes
2. Identifies the pattern (e.g., all yellow notes labeled "Idea N")
3. Finds the next available number
4. Creates 5 new notes continuing the sequence
5. Places them near existing notes or in empty space

---

#### Command: "Organize this mess" (when board is cluttered)
**AI Behavior:**
1. Calls `getBoardState`
2. Groups similar items (by color, type, or proximity)
3. Creates frames for each group
4. Uses `arrangeGrid` to organize items within frames
5. Provides summary: "I've organized 23 items into 4 categories"

---

### 6. Deletion & Cleanup Commands

#### Command: "Delete all yellow sticky notes"
**AI Actions:**
```javascript
// Get board state
const state = getBoardState();

// Find all yellow sticky notes
const yellowNoteIds = state.objects
  .filter(obj => obj.type === 'stickyNote' && obj.color === 'yellow')
  .map(obj => obj.id);

// Delete them
deleteObjects({ objectIds: yellowNoteIds });
```

---

#### Command: "Clear everything except the frames"
**AI Actions:**
```javascript
const state = getBoardState();
const nonFrameIds = state.objects
  .filter(obj => obj.type !== 'frame')
  .map(obj => obj.id);
  
deleteObjects({ objectIds: nonFrameIds });
```

---

## Advanced AI Behaviors

### 1. Intelligent Positioning
When AI creates elements without specific positions, it:
- Avoids overlapping existing elements
- Uses logical grouping (related items near each other)
- Maintains visual balance
- Respects existing layouts

### 2. Multi-Turn Conversations
```
User: "Create a kanban board"
AI: [Creates 3 columns: To Do, In Progress, Done]

User: "Add 5 tasks to the To Do column"
AI: [Remembers the kanban context, adds tasks in the first column]

User: "Move the first task to In Progress"
AI: [Identifies which task is "first" and moves it to middle column]
```

### 3. Error Handling & Suggestions
```
User: "Delete the blue thing"
AI: "I found 3 blue objects: 2 sticky notes and 1 rectangle. 
     Would you like me to delete all of them, or can you be more specific?"
```

### 4. Template Generation from Descriptions
```
User: "I need a board for planning a product launch"
AI: [Creates multi-section board with:
     - Timeline frame with key dates
     - Tasks column with checklist items
     - Stakeholders section
     - Risks/dependencies area
     - Success metrics section]
```

---

## AI Tool Call Patterns

### Pattern 1: Sequential Creation
```
User request → Multiple createX calls in sequence
Example: "Create 3 sticky notes"
```

### Pattern 2: Query Then Act
```
User request → getBoardState → Analyze → Execute tools
Example: "Move all pink notes to the left"
```

### Pattern 3: Create Then Organize
```
User request → Create multiple objects → arrangeGrid
Example: "Create a 2x3 grid of ideas"
```

### Pattern 4: Template Expansion
```
User request → Create frames → Add elements → Position
Example: "Create a SWOT analysis"
```

---

## Response Examples

### Success Response
```
"I've created a SWOT analysis template with four quadrants: 
Strengths (green), Weaknesses (pink), Opportunities (blue), 
and Threats (orange). Each quadrant has a placeholder sticky 
note to get you started. You can now add your own insights 
to each section!"
```

### Clarification Response
```
"I found 12 sticky notes on the board. Would you like me to 
arrange all of them in a grid, or just specific ones? You can 
say 'all sticky notes' or specify by color like 'all yellow notes'."
```

### Error Response
```
"I couldn't find any pink sticky notes on the board. 
Would you like me to create some first?"
```

---

## Tips for Users

### Be Specific When Needed
- ❌ "Add some notes"
- ✅ "Add 5 yellow sticky notes for brainstorming ideas"

### Use Natural Language
- ❌ "createStickyNote(text='hello', x=100, y=200, color='blue')"
- ✅ "Add a blue sticky note that says hello at the top left"

### Build Iteratively
```
1. "Create a project planning board"
2. "Add tasks to the backlog"
3. "Move high priority tasks to the sprint column"
4. "Color code tasks by team"
```

### Leverage AI's Understanding
- "Organize this better" - AI will figure out the best layout
- "Make it look like a typical kanban board" - AI knows the pattern
- "Add the usual retrospective sections" - AI knows the template

---

## Limitations & Future Enhancements

### Current Limitations
- No connector lines between elements (yet)
- No image support
- No freehand drawing
- Single board per session
- No persistent storage

### Planned AI Enhancements
- Voice command support
- Image upload and placement
- AI-generated diagrams from text
- Auto-suggest next steps
- Smart templates based on industry/use case
- Collaboration insights ("Your team mostly uses yellow notes")

---

## Debugging AI Behavior

If AI doesn't do what you expect:

1. **Check board state**: "What's on the board right now?"
2. **Be more specific**: Instead of "move it", say "move the blue rectangle to x:500, y:300"
3. **Simplify complex requests**: Break into smaller steps
4. **Use the console**: Check the browser console for tool call logs

The AI logs all tool calls, so you can see exactly what it's trying to do!
