import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2, Trash2, MousePointer, Pen, StickyNote, Type, Square, Circle, ArrowRight, Minus, ArrowLeft, Share2, Cloud, CloudOff, Loader, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useBoard } from './hooks/useBoard';
import { useAutoSave } from './hooks/useAutoSave';
import { usePresence } from './hooks/usePresence';
import { useBoardSync } from './hooks/useBoardSync';
import PresenceBar from './components/PresenceBar';
import ShareModal from './components/ShareModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AIBoard = () => {
  const { id: boardId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { loadBoard, saveBoard } = useBoard();
  const { onlineUsers, updateCursor } = usePresence(boardId, user);

  // Real-time board sync
  useBoardSync(boardId, boardObjects, setBoardObjects, user);

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
  const [activeTool, setActiveTool] = useState('select');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [boardTitle, setBoardTitle] = useState('Untitled Board');
  const [showShareModal, setShowShareModal] = useState(false);
  const [boardLoaded, setBoardLoaded] = useState(false);

  const canvasRef = useRef(null);
  const nextId = useRef(1);

  // Auto-save
  const saveStatus = useAutoSave(boardId, boardObjects, nextId.current, boardLoaded ? saveBoard : null);

  // Load board data on mount
  useEffect(() => {
    if (!boardId) return;
    const load = async () => {
      try {
        const board = await loadBoard(boardId);
        setBoardTitle(board.title || 'Untitled Board');
        if (board.board_data) {
          const data = typeof board.board_data === 'string'
            ? JSON.parse(board.board_data)
            : board.board_data;
          setBoardObjects(data.objects || []);
          nextId.current = data.nextId || (data.objects?.length ? Math.max(...data.objects.map(o => o.id)) + 1 : 1);
        }
        setBoardLoaded(true);
      } catch (err) {
        console.error('Failed to load board:', err);
        navigate('/');
      }
    };
    load();
  }, [boardId]);

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
        const response = await fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: "You are an AI assistant that helps users create and manipulate elements on a visual collaboration board (like Miro). Use the provided tools to create sticky notes, shapes, frames, and organize them. Always use getBoardState first when you need to know what's currently on the board before manipulating existing objects. Place elements at reasonable positions that don't overlap. Be creative and helpful.",
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
    // Update cursor position for other users
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && updateCursor) {
      const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
      const y = (e.clientY - rect.top - viewportOffset.y) / zoom;
      updateCursor(x, y);
    }

    if (isPanning) {
      setViewportOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isResizing && selectedId) {
      const mouseX = (e.clientX - viewportOffset.x) / zoom;
      const mouseY = (e.clientY - viewportOffset.y) / zoom;

      setBoardObjects(prev => prev.map(obj => {
        if (obj.id === selectedId) {
          const newWidth = Math.max(50, mouseX - obj.x);
          const newHeight = Math.max(50, mouseY - obj.y);
          return { ...obj, width: newWidth, height: newHeight };
        }
        return obj;
      }));
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
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 3));
  };

  // Delete selected object
  const handleDelete = useCallback(() => {
    if (selectedId) {
      setBoardObjects(prev => prev.filter(obj => obj.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);

  // Layering functions
  const bringToFront = useCallback(() => {
    if (!selectedId) return;
    setBoardObjects(prev => {
      const obj = prev.find(o => o.id === selectedId);
      if (!obj) return prev;
      return [...prev.filter(o => o.id !== selectedId), obj];
    });
  }, [selectedId]);

  const sendToBack = useCallback(() => {
    if (!selectedId) return;
    setBoardObjects(prev => {
      const obj = prev.find(o => o.id === selectedId);
      if (!obj) return prev;
      return [obj, ...prev.filter(o => o.id !== selectedId)];
    });
  }, [selectedId]);

  const bringForward = useCallback(() => {
    if (!selectedId) return;
    setBoardObjects(prev => {
      const index = prev.findIndex(o => o.id === selectedId);
      if (index === -1 || index === prev.length - 1) return prev;
      const newArray = [...prev];
      [newArray[index], newArray[index + 1]] = [newArray[index + 1], newArray[index]];
      return newArray;
    });
  }, [selectedId]);

  const sendBackward = useCallback(() => {
    if (!selectedId) return;
    setBoardObjects(prev => {
      const index = prev.findIndex(o => o.id === selectedId);
      if (index <= 0) return prev;
      const newArray = [...prev];
      [newArray[index], newArray[index - 1]] = [newArray[index - 1], newArray[index]];
      return newArray;
    });
  }, [selectedId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleDelete]);

  // Tool handlers
  const handleCanvasClick = (e) => {
    if (activeTool === 'select' || draggedId || isPanning) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
    const y = (e.clientY - rect.top - viewportOffset.y) / zoom;

    if (activeTool === 'sticky') {
      const newNote = {
        id: nextId.current++,
        type: 'stickyNote',
        x,
        y,
        width: 200,
        height: 200,
        color: 'yellow',
        text: 'New note...'
      };
      setBoardObjects(prev => [...prev, newNote]);
      setActiveTool('select');
    } else if (activeTool === 'text') {
      const newText = {
        id: nextId.current++,
        type: 'text',
        x,
        y,
        width: 200,
        height: 50,
        text: 'Type here...'
      };
      setBoardObjects(prev => [...prev, newText]);
      setActiveTool('select');
    } else if (activeTool === 'rectangle') {
      const newShape = {
        id: nextId.current++,
        type: 'shape',
        shapeType: 'rectangle',
        x,
        y,
        width: 150,
        height: 100,
        color: '#81D4FA'
      };
      setBoardObjects(prev => [...prev, newShape]);
      setActiveTool('select');
    } else if (activeTool === 'circle') {
      const newShape = {
        id: nextId.current++,
        type: 'shape',
        shapeType: 'circle',
        x,
        y,
        width: 120,
        height: 120,
        color: '#A5D6A7'
      };
      setBoardObjects(prev => [...prev, newShape]);
      setActiveTool('select');
    }
  };

  // Color mapping
  const getColor = (color) => {
    const colors = {
      yellow: '#FFF59D',
      pink: '#F48FB1',
      blue: '#81D4FA',
      green: '#A5D6A7',
      purple: '#CE93D8',
      orange: '#FFAB91',
      white: '#FFFFFF'
    };
    return colors[color] || color;
  };

  // Render board object
  const renderObject = (obj) => {
    const isSelected = obj.id === selectedId;
    const isEditing = obj.id === editingId;

    if (obj.type === 'stickyNote') {
      return (
        <div
          key={obj.id}
          onMouseDown={(e) => {
            if (!isEditing) handleMouseDown(e, obj.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingId(obj.id);
            setEditingText(obj.text);
          }}
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
            cursor: isEditing ? 'text' : 'move',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            fontSize: '14px',
            overflow: 'auto',
            userSelect: isEditing ? 'text' : 'none'
          }}
        >
          {isEditing ? (
            <textarea
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={() => {
                setBoardObjects(prev => prev.map(o =>
                  o.id === obj.id ? { ...o, text: editingText } : o
                ));
                setEditingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingId(null);
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'none',
                color: 'inherit'
              }}
            />
          ) : (
            obj.text
          )}
        </div>
      );
    }
    
    if (obj.type === 'shape') {
      return (
        <div
          key={obj.id}
          style={{
            position: 'absolute',
            left: obj.x,
            top: obj.y,
            width: obj.width,
            height: obj.height
          }}
        >
          <div
            onMouseDown={(e) => handleMouseDown(e, obj.id)}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: getColor(obj.color),
              border: isSelected ? '3px solid #2196F3' : '2px solid rgba(0,0,0,0.3)',
              borderRadius: obj.shapeType === 'circle' ? '50%' : '4px',
              cursor: 'move'
            }}
          />
          {isSelected && (
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsResizing(true);
                setResizeHandle('se');
              }}
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: '12px',
                height: '12px',
                background: '#2196F3',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'nwse-resize',
                zIndex: 1000
              }}
            />
          )}
        </div>
      );
    }

    if (obj.type === 'text') {
      return (
        <div
          key={obj.id}
          onMouseDown={(e) => {
            if (!isEditing) handleMouseDown(e, obj.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingId(obj.id);
            setEditingText(obj.text);
          }}
          style={{
            position: 'absolute',
            left: obj.x,
            top: obj.y,
            minWidth: obj.width || 100,
            padding: '8px',
            border: isSelected ? '2px solid #2196F3' : '2px solid transparent',
            borderRadius: '4px',
            cursor: isEditing ? 'text' : 'move',
            fontSize: '16px',
            fontFamily: 'system-ui, sans-serif',
            color: '#333',
            userSelect: isEditing ? 'text' : 'none',
            whiteSpace: 'pre-wrap'
          }}
        >
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={() => {
                setBoardObjects(prev => prev.map(o =>
                  o.id === obj.id ? { ...o, text: editingText } : o
                ));
                setEditingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.target.blur();
                }
              }}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '16px',
                fontFamily: 'system-ui, sans-serif',
                color: '#333'
              }}
            />
          ) : (
            obj.text
          )}
        </div>
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
      {/* Board Header */}
      <div style={{
        padding: '10px 16px',
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            background: 'none',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#666',
            fontSize: '13px',
          }}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <input
          type="text"
          value={boardTitle}
          onChange={(e) => setBoardTitle(e.target.value)}
          onBlur={() => saveBoard(boardId, null, boardTitle)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a',
            padding: '4px 8px',
            borderRadius: '4px',
            background: 'transparent',
            minWidth: '200px',
          }}
          onFocus={(e) => e.target.style.background = '#f5f5f5'}
          onBlurCapture={(e) => e.target.style.background = 'transparent'}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: saveStatus === 'saved' ? '#4caf50' : saveStatus === 'saving' ? '#ff9800' : saveStatus === 'error' ? '#f44336' : '#999',
        }}>
          {saveStatus === 'saved' && <><Cloud size={14} /> Saved</>}
          {saveStatus === 'saving' && <><Loader size={14} /> Saving...</>}
          {saveStatus === 'unsaved' && <><CloudOff size={14} /> Unsaved</>}
          {saveStatus === 'error' && <><CloudOff size={14} /> Save failed</>}
        </div>
        <div style={{ flex: 1 }} />
        <PresenceBar users={onlineUsers} currentUser={user} />
        <button
          onClick={() => setShowShareModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          <Share2 size={14} />
          Share
        </button>
      </div>

      {showShareModal && (
        <ShareModal
          boardId={boardId}
          onClose={() => setShowShareModal(false)}
        />
      )}

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
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Left Toolbar - Floating */}
        <div style={{
          position: 'absolute',
          left: '16px',
          top: '16px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px',
          gap: '4px',
          alignItems: 'center',
          zIndex: 10
        }}>
          {[
            { id: 'select', icon: MousePointer, label: 'Select' },
            { id: 'pen', icon: Pen, label: 'Draw' },
            { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'rectangle', icon: Square, label: 'Rectangle' },
            { id: 'circle', icon: Circle, label: 'Circle' },
            { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
            { id: 'line', icon: Minus, label: 'Line' }
          ].map(tool => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                title={tool.label}
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isActive ? '#2196F3' : 'transparent',
                  color: isActive ? 'white' : '#666',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={20} />
              </button>
            );
          })}

          {/* Layering and Delete buttons - shows when object is selected */}
          {selectedId && (
            <>
              <div style={{
                width: '100%',
                height: '1px',
                background: '#e0e0e0',
                margin: '8px 0'
              }} />

              {/* Layering controls */}
              <button
                onClick={bringToFront}
                title="Bring to Front"
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ChevronsUp size={20} />
              </button>

              <button
                onClick={bringForward}
                title="Bring Forward"
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ChevronUp size={20} />
              </button>

              <button
                onClick={sendBackward}
                title="Send Backward"
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ChevronDown size={20} />
              </button>

              <button
                onClick={sendToBack}
                title="Send to Back"
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ChevronsDown size={20} />
              </button>

              <div style={{
                width: '100%',
                height: '1px',
                background: '#e0e0e0',
                margin: '8px 0'
              }} />

              {/* Delete button */}
              <button
                onClick={handleDelete}
                title="Delete (Del)"
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#f44336',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d32f2f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f44336';
                }}
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>

        {/* Main Canvas */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : draggedId ? 'grabbing' : activeTool === 'select' ? 'default' : 'crosshair',
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

          {/* Multiplayer Cursors */}
          {onlineUsers
            .filter(u => u.user_id !== user?.id && u.cursor)
            .map((u, idx) => (
              <div
                key={u.user_id || idx}
                style={{
                  position: 'absolute',
                  left: `${u.cursor.x}px`,
                  top: `${u.cursor.y}px`,
                  pointerEvents: 'none',
                  zIndex: 10000,
                  transform: 'translate(-2px, -2px)',
                }}
              >
                {/* Cursor pointer */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                  <path
                    d="M5.65376 12.3673L11.6126 5.48095C12.0744 4.93352 12.9426 5.26073 12.9426 5.98534L12.9426 10.1721C12.9426 10.5183 13.2221 10.7977 13.5683 10.7977L18.3479 10.7977C18.9989 10.7977 19.3072 11.6137 18.7889 12.0623L12.8301 18.9486C12.3683 19.496 11.5001 19.1688 11.5001 18.4442L11.5001 14.2575C11.5001 13.9113 11.2206 13.6318 10.8744 13.6318L6.09482 13.6318C5.44382 13.6318 5.13553 12.8158 5.65376 12.3673Z"
                    fill={`hsl(${(idx * 137.5) % 360}, 70%, 60%)`}
                  />
                </svg>
                {/* Name label */}
                <div style={{
                  marginTop: '4px',
                  marginLeft: '12px',
                  padding: '4px 8px',
                  background: `hsl(${(idx * 137.5) % 360}, 70%, 60%)`,
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}>
                  {u.display_name || u.email?.split('@')[0] || 'User'}
                </div>
              </div>
            ))}
        </div>
        </div>
      </div>

      {/* Bottom Toolbar */}
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
        <div>Online: {onlineUsers.length}</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            if (confirm('Clear all objects from this board?')) {
              setBoardObjects([]);
              setConversationHistory([]);
              setAiResponse('');
            }
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
