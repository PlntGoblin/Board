import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, Trash2, Move, Square, StickyNote, Box } from 'lucide-react';

const AIBoard = () => {
  const [boardObjects, setBoardObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [aiResponse, setAiResponse] = useState('');
  
  const canvasRef = useRef(null);
  const nextId = useRef(1);

  // Board manipulation tools for AI
  const boardTools = [
    {
      name: "createStickyNote",
      description: "Create a sticky note on the board",
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text content of the sticky note" },
          x: { type: "number", description: "X position on the board" },
          y: { type: "number", description: "Y position on the board" },
          color: { 
            type: "string", 
            description: "Color of the sticky note",
            enum: ["yellow", "pink", "blue", "green", "purple", "orange"]
          }
        },
        required: ["text", "x", "y", "color"]
      }
    },
    {
      name: "createShape",
      description: "Create a shape (rectangle or circle) on the board",
      input_schema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["rectangle", "circle"], description: "Type of shape" },
          x: { type: "number", description: "X position" },
          y: { type: "number", description: "Y position" },
          width: { type: "number", description: "Width of the shape" },
          height: { type: "number", description: "Height of the shape" },
          color: { type: "string", description: "Fill color of the shape" }
        },
        required: ["type", "x", "y", "width", "height", "color"]
      }
    },
    {
      name: "createFrame",
      description: "Create a frame container on the board",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the frame" },
          x: { type: "number", description: "X position" },
          y: { type: "number", description: "Y position" },
          width: { type: "number", description: "Width of the frame" },
          height: { type: "number", description: "Height of the frame" }
        },
        required: ["title", "x", "y", "width", "height"]
      }
    },
    {
      name: "moveObject",
      description: "Move an object to a new position. Can move multiple objects if objectIds is an array.",
      input_schema: {
        type: "object",
        properties: {
          objectIds: { 
            type: "array",
            items: { type: "number" },
            description: "Array of object IDs to move" 
          },
          x: { type: "number", description: "New X position (or X offset if relative)" },
          y: { type: "number", description: "New Y position (or Y offset if relative)" },
          relative: { type: "boolean", description: "If true, x and y are offsets from current position" }
        },
        required: ["objectIds", "x", "y"]
      }
    },
    {
      name: "changeColor",
      description: "Change the color of one or more objects",
      input_schema: {
        type: "object",
        properties: {
          objectIds: { 
            type: "array",
            items: { type: "number" },
            description: "Array of object IDs to recolor" 
          },
          color: { type: "string", description: "New color" }
        },
        required: ["objectIds", "color"]
      }
    },
    {
      name: "updateText",
      description: "Update the text content of an object",
      input_schema: {
        type: "object",
        properties: {
          objectId: { type: "number", description: "ID of the object to update" },
          newText: { type: "string", description: "New text content" }
        },
        required: ["objectId", "newText"]
      }
    },
    {
      name: "arrangeGrid",
      description: "Arrange selected objects in a grid layout",
      input_schema: {
        type: "object",
        properties: {
          objectIds: { 
            type: "array",
            items: { type: "number" },
            description: "Array of object IDs to arrange" 
          },
          columns: { type: "number", description: "Number of columns in the grid" },
          spacing: { type: "number", description: "Spacing between elements" },
          startX: { type: "number", description: "Starting X position for the grid" },
          startY: { type: "number", description: "Starting Y position for the grid" }
        },
        required: ["objectIds", "columns", "spacing", "startX", "startY"]
      }
    },
    {
      name: "getBoardState",
      description: "Get the current state of all objects on the board including their IDs, positions, types, colors, and text",
      input_schema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "deleteObjects",
      description: "Delete one or more objects from the board",
      input_schema: {
        type: "object",
        properties: {
          objectIds: { 
            type: "array",
            items: { type: "number" },
            description: "Array of object IDs to delete" 
          }
        },
        required: ["objectIds"]
      }
    }
  ];

  // Execute AI tool calls
  const executeToolCall = useCallback((toolName, toolInput) => {
    console.log(`Executing tool: ${toolName}`, toolInput);
    
    switch (toolName) {
      case "createStickyNote": {
        const newNote = {
          id: nextId.current++,
          type: 'stickyNote',
          x: toolInput.x,
          y: toolInput.y,
          width: 200,
          height: 200,
          color: toolInput.color,
          text: toolInput.text
        };
        setBoardObjects(prev => [...prev, newNote]);
        return { success: true, objectId: newNote.id };
      }
      
      case "createShape": {
        const newShape = {
          id: nextId.current++,
          type: 'shape',
          shapeType: toolInput.type,
          x: toolInput.x,
          y: toolInput.y,
          width: toolInput.width,
          height: toolInput.height,
          color: toolInput.color
        };
        setBoardObjects(prev => [...prev, newShape]);
        return { success: true, objectId: newShape.id };
      }
      
      case "createFrame": {
        const newFrame = {
          id: nextId.current++,
          type: 'frame',
          x: toolInput.x,
          y: toolInput.y,
          width: toolInput.width,
          height: toolInput.height,
          title: toolInput.title
        };
        setBoardObjects(prev => [...prev, newFrame]);
        return { success: true, objectId: newFrame.id };
      }
      
      case "moveObject": {
        setBoardObjects(prev => prev.map(obj => {
          if (toolInput.objectIds.includes(obj.id)) {
            return {
              ...obj,
              x: toolInput.relative ? obj.x + toolInput.x : toolInput.x,
              y: toolInput.relative ? obj.y + toolInput.y : toolInput.y
            };
          }
          return obj;
        }));
        return { success: true, movedCount: toolInput.objectIds.length };
      }
      
      case "changeColor": {
        setBoardObjects(prev => prev.map(obj => {
          if (toolInput.objectIds.includes(obj.id)) {
            return { ...obj, color: toolInput.color };
          }
          return obj;
        }));
        return { success: true, updatedCount: toolInput.objectIds.length };
      }
      
      case "updateText": {
        setBoardObjects(prev => prev.map(obj => {
          if (obj.id === toolInput.objectId) {
            return { ...obj, text: toolInput.newText };
          }
          return obj;
        }));
        return { success: true };
      }
      
      case "arrangeGrid": {
        const objectsToArrange = boardObjects.filter(obj => 
          toolInput.objectIds.includes(obj.id)
        );
        
        setBoardObjects(prev => prev.map(obj => {
          const index = toolInput.objectIds.indexOf(obj.id);
          if (index !== -1) {
            const row = Math.floor(index / toolInput.columns);
            const col = index % toolInput.columns;
            return {
              ...obj,
              x: toolInput.startX + col * (200 + toolInput.spacing),
              y: toolInput.startY + row * (200 + toolInput.spacing)
            };
          }
          return obj;
        }));
        return { success: true, arrangedCount: objectsToArrange.length };
      }
      
      case "getBoardState": {
        return { 
          objects: boardObjects.map(obj => ({
            id: obj.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            color: obj.color,
            text: obj.text,
            title: obj.title,
            shapeType: obj.shapeType
          }))
        };
      }
      
      case "deleteObjects": {
        const idsToDelete = new Set(toolInput.objectIds);
        setBoardObjects(prev => prev.filter(obj => !idsToDelete.has(obj.id)));
        return { success: true, deletedCount: toolInput.objectIds.length };
      }
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }, [boardObjects]);

  // Process AI command
  const processAICommand = async () => {
    if (!aiInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setAiResponse('');
    
    const userMessage = { role: "user", content: aiInput };
    const newHistory = [...conversationHistory, userMessage];
    
    try {
      let currentMessages = newHistory;
      let continueProcessing = true;
      let assistantResponse = '';
      
      while (continueProcessing) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            tools: boardTools,
            messages: currentMessages
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'API request failed');
        }

        // Process the response
        if (data.content) {
          for (const block of data.content) {
            if (block.type === 'text') {
              assistantResponse += block.text;
              setAiResponse(prev => prev + block.text);
            } else if (block.type === 'tool_use') {
              // Execute the tool
              const result = executeToolCall(block.name, block.input);
              
              // Add tool result to messages
              currentMessages = [
                ...currentMessages,
                { role: "assistant", content: data.content },
                {
                  role: "user",
                  content: [{
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: JSON.stringify(result)
                  }]
                }
              ];
            }
          }
        }

        // Check if we need to continue (if there were tool uses)
        const hasToolUse = data.content?.some(block => block.type === 'tool_use');
        continueProcessing = hasToolUse && data.stop_reason === 'tool_use';
        
        if (!continueProcessing) {
          // Save final conversation state
          setConversationHistory([
            ...newHistory,
            { role: "assistant", content: data.content }
          ]);
        }
      }
      
      setAiInput('');
    } catch (error) {
      console.error('AI Error:', error);
      setAiResponse(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Canvas interaction handlers
  const handleMouseDown = (e, objId = null) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewportOffset.x, y: e.clientY - viewportOffset.y });
      e.preventDefault();
      return;
    }
    
    if (objId) {
      setDraggedId(objId);
      setSelectedId(objId);
      const obj = boardObjects.find(o => o.id === objId);
      if (obj) {
        setDragOffset({
          x: (e.clientX - viewportOffset.x) / zoom - obj.x,
          y: (e.clientY - viewportOffset.y) / zoom - obj.y
        });
      }
      e.stopPropagation();
    } else {
      setSelectedId(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setViewportOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }
    
    if (draggedId) {
      const newX = (e.clientX - viewportOffset.x) / zoom - dragOffset.x;
      const newY = (e.clientY - viewportOffset.y) / zoom - dragOffset.y;
      
      setBoardObjects(prev => prev.map(obj =>
        obj.id === draggedId ? { ...obj, x: newX, y: newY } : obj
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggedId(null);
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 3));
  };

  // Color mapping
  const getColor = (color) => {
    const colors = {
      yellow: '#FFF59D',
      pink: '#F48FB1',
      blue: '#81D4FA',
      green: '#A5D6A7',
      purple: '#CE93D8',
      orange: '#FFAB91'
    };
    return colors[color] || color;
  };

  // Render board object
  const renderObject = (obj) => {
    const isSelected = obj.id === selectedId;
    
    if (obj.type === 'stickyNote') {
      return (
        <div
          key={obj.id}
          onMouseDown={(e) => handleMouseDown(e, obj.id)}
          style={{
            position: 'absolute',
            left: obj.x,
            top: obj.y,
            width: obj.width,
            height: obj.height,
            backgroundColor: getColor(obj.color),
            border: isSelected ? '3px solid #2196F3' : '2px solid rgba(0,0,0,0.1)',
            borderRadius: '4px',
            padding: '16px',
            cursor: 'move',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            fontSize: '14px',
            overflow: 'auto',
            userSelect: 'none'
          }}
        >
          {obj.text}
        </div>
      );
    }
    
    if (obj.type === 'shape') {
      return (
        <div
          key={obj.id}
          onMouseDown={(e) => handleMouseDown(e, obj.id)}
          style={{
            position: 'absolute',
            left: obj.x,
            top: obj.y,
            width: obj.width,
            height: obj.height,
            backgroundColor: getColor(obj.color),
            border: isSelected ? '3px solid #2196F3' : '2px solid rgba(0,0,0,0.3)',
            borderRadius: obj.shapeType === 'circle' ? '50%' : '4px',
            cursor: 'move'
          }}
        />
      );
    }
    
    if (obj.type === 'frame') {
      return (
        <div
          key={obj.id}
          onMouseDown={(e) => handleMouseDown(e, obj.id)}
          style={{
            position: 'absolute',
            left: obj.x,
            top: obj.y,
            width: obj.width,
            height: obj.height,
            border: isSelected ? '3px solid #2196F3' : '2px dashed #666',
            borderRadius: '8px',
            cursor: 'move',
            backgroundColor: 'rgba(255,255,255,0.05)'
          }}
        >
          <div style={{
            position: 'absolute',
            top: -30,
            left: 0,
            padding: '4px 12px',
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {obj.title}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {/* AI Command Panel */}
      <div style={{
        padding: '16px',
        background: 'white',
        borderBottom: '2px solid #e0e0e0',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && processAICommand()}
              placeholder="Ask AI to create, move, or arrange board elements..."
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            <button
              onClick={processAICommand}
              disabled={isProcessing || !aiInput.trim()}
              style={{
                padding: '12px 24px',
                background: isProcessing ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isProcessing ? 'Processing...' : 'Send'}
            </button>
          </div>
          {aiResponse && (
            <div style={{
              padding: '12px',
              background: '#f0f7ff',
              border: '1px solid #90caf9',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1976d2'
            }}>
              {aiResponse}
            </div>
          )}
        </div>
      </div>

      {/* Example Commands */}
      <div style={{
        padding: '12px 16px',
        background: '#fff9e6',
        borderBottom: '1px solid #ffe082',
        fontSize: '12px',
        color: '#666'
      }}>
        <strong>Try:</strong> "Create 3 yellow sticky notes with ideas for our project" • "Arrange all sticky notes in a 2x2 grid" • "Create a SWOT analysis with 4 frames" • "Move all pink notes to the right"
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : draggedId ? 'grabbing' : 'default',
          background: 'linear-gradient(#e8e8e8 1px, transparent 1px), linear-gradient(90deg, #e8e8e8 1px, transparent 1px)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${viewportOffset.x}px ${viewportOffset.y}px`
        }}
      >
        <div style={{
          transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'relative',
          width: '5000px',
          height: '5000px'
        }}>
          {boardObjects.map(renderObject)}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        padding: '12px 16px',
        background: 'white',
        borderTop: '2px solid #e0e0e0',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        fontSize: '13px',
        color: '#666'
      }}>
        <div>Objects: {boardObjects.length}</div>
        <div>Zoom: {Math.round(zoom * 100)}%</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            setBoardObjects([]);
            setConversationHistory([]);
            setAiResponse('');
          }}
          style={{
            padding: '8px 16px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px'
          }}
        >
          <Trash2 size={14} />
          Clear Board
        </button>
      </div>
    </div>
  );
};

export default AIBoard;
