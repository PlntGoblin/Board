import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2, Trash2, MousePointer, Pen, StickyNote, Type, Square, Circle, ArrowRight, Minus, ArrowLeft, Share2, Cloud, CloudOff, Loader, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, Undo, Redo, Plus, Maximize2, Users } from 'lucide-react';
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
  const [showAIChat, setShowAIChat] = useState(false);
  const [isWizardHovered, setIsWizardHovered] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [drawColor, setDrawColor] = useState('#000000');
  const [lineStart, setLineStart] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  const canvasRef = useRef(null);
  const nextId = useRef(1);

  // Real-time board sync
  useBoardSync(boardId, boardObjects, setBoardObjects, user);

  // Auto-save
  const saveStatus = useAutoSave(boardId, boardObjects, nextId.current, boardLoaded ? saveBoard : null);

  // Track history for undo/redo (only after board is loaded, skip during undo/redo)
  useEffect(() => {
    if (!boardLoaded) return;
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, boardObjects];
    });
    setHistoryIndex(prev => prev + 1);
  }, [boardObjects]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    isUndoRedo.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setBoardObjects(history[newIndex]);
    setSelectedId(null);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    isUndoRedo.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setBoardObjects(history[newIndex]);
    setSelectedId(null);
  }, [history, historyIndex]);

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

  const zoomIn = useCallback(() => setZoom(prev => Math.min(+(prev * 1.25).toFixed(2), 3)), []);
  const zoomOut = useCallback(() => setZoom(prev => Math.max(+(prev / 1.25).toFixed(2), 0.1)), []);
  const fitToScreen = useCallback(() => { setZoom(1); setViewportOffset({ x: 0, y: 0 }); }, []);

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

      // Handle drawing tools
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && (activeTool === 'pen' || activeTool === 'arrow' || activeTool === 'line')) {
        const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
        const y = (e.clientY - rect.top - viewportOffset.y) / zoom;

        if (activeTool === 'pen') {
          setIsDrawing(true);
          setCurrentPath([{ x, y }]);
        } else if (activeTool === 'arrow' || activeTool === 'line') {
          setLineStart({ x, y });
        }
      }
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

    // Handle pen drawing
    if (isDrawing && activeTool === 'pen' && rect) {
      const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
      const y = (e.clientY - rect.top - viewportOffset.y) / zoom;
      setCurrentPath(prev => [...prev, { x, y }]);
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

  const handleMouseUp = (e) => {
    // Finish pen drawing
    if (isDrawing && activeTool === 'pen' && currentPath.length > 1) {
      const newPath = {
        id: nextId.current++,
        type: 'path',
        points: currentPath,
        color: drawColor,
        strokeWidth: 3
      };
      setBoardObjects(prev => [...prev, newPath]);
      setIsDrawing(false);
      setCurrentPath([]);
      setActiveTool('select');
    }

    // Finish line or arrow
    if (lineStart && (activeTool === 'line' || activeTool === 'arrow')) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
        const y = (e.clientY - rect.top - viewportOffset.y) / zoom;

        const newLine = {
          id: nextId.current++,
          type: activeTool,
          x1: lineStart.x,
          y1: lineStart.y,
          x2: x,
          y2: y,
          color: drawColor,
          strokeWidth: 3
        };
        setBoardObjects(prev => [...prev, newLine]);
        setLineStart(null);
        setActiveTool('select');
      }
    }

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
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleDelete, handleUndo, handleRedo]);

  // Close zoom menu on outside click
  useEffect(() => {
    if (!showZoomMenu) return;
    const close = () => setShowZoomMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showZoomMenu]);

  // Tool handlers
  const handleCanvasClick = (e) => {
    if (activeTool === 'select' || activeTool === 'pen' || activeTool === 'arrow' || activeTool === 'line' || draggedId || isPanning) return;

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

    // Render path (pen drawing)
    if (obj.type === 'path') {
      if (obj.points.length < 2) return null;

      const pathString = obj.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');

      return (
        <svg
          key={obj.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '5000px',
            height: '5000px',
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          <path
            d={pathString}
            stroke={obj.color}
            strokeWidth={obj.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isSelected ? 0.7 : 1}
          />
        </svg>
      );
    }

    // Render line
    if (obj.type === 'line') {
      return (
        <svg
          key={obj.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '5000px',
            height: '5000px',
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          <line
            x1={obj.x1}
            y1={obj.y1}
            x2={obj.x2}
            y2={obj.y2}
            stroke={obj.color}
            strokeWidth={obj.strokeWidth}
            strokeLinecap="round"
            opacity={isSelected ? 0.7 : 1}
          />
        </svg>
      );
    }

    // Render arrow
    if (obj.type === 'arrow') {
      const dx = obj.x2 - obj.x1;
      const dy = obj.y2 - obj.y1;
      const angle = Math.atan2(dy, dx);
      const arrowSize = 12;

      return (
        <svg
          key={obj.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '5000px',
            height: '5000px',
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          <defs>
            <marker
              id={`arrowhead-${obj.id}`}
              markerWidth={arrowSize}
              markerHeight={arrowSize}
              refX={arrowSize - 2}
              refY={arrowSize / 2}
              orient="auto"
            >
              <polygon
                points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`}
                fill={obj.color}
              />
            </marker>
          </defs>
          <line
            x1={obj.x1}
            y1={obj.y1}
            x2={obj.x2}
            y2={obj.y2}
            stroke={obj.color}
            strokeWidth={obj.strokeWidth}
            strokeLinecap="round"
            markerEnd={`url(#arrowhead-${obj.id})`}
            opacity={isSelected ? 0.7 : 1}
          />
        </svg>
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
        {/* Online count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          background: '#f5f5f5',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#555',
          fontWeight: '500',
        }}>
          <Users size={13} />
          {onlineUsers.length}
        </div>
        {/* Clear Board */}
        <button
          onClick={() => {
            if (confirm('Clear all objects from this board?')) {
              setBoardObjects([]);
              setConversationHistory([]);
              setAiResponse('');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            background: 'none',
            border: '1px solid #f44336',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#f44336',
            fontSize: '13px',
          }}
        >
          <Trash2 size={13} />
          Clear
        </button>
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

      {/* AI Wizard Button - Floating */}
      <div style={{
        position: 'fixed',
        top: '90px',
        right: '24px',
        zIndex: 100,
      }}>
        {/* Wizard Button */}
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          onMouseEnter={() => setIsWizardHovered(true)}
          onMouseLeave={() => setIsWizardHovered(false)}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
            transform: isWizardHovered ? 'scale(1.1)' : 'scale(1)',
            position: 'relative',
          }}
        >
          🧙‍♂️
          {/* Magic dust particles */}
          {isWizardHovered && (
            <>
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '10px',
                fontSize: '16px',
                animation: 'float-sparkle-1 2s infinite ease-in-out',
              }}>✨</div>
              <div style={{
                position: 'absolute',
                top: '5px',
                right: '-5px',
                fontSize: '12px',
                animation: 'float-sparkle-2 1.8s infinite ease-in-out',
              }}>✨</div>
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '-8px',
                fontSize: '14px',
                animation: 'float-sparkle-3 2.2s infinite ease-in-out',
              }}>✨</div>
            </>
          )}
        </button>

        {/* AI Chat Box */}
        {showAIChat && (
          <div style={{
            position: 'absolute',
            top: '80px',
            right: '0',
            width: '400px',
            maxWidth: '90vw',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            boxShadow: '0 12px 48px rgba(102, 126, 234, 0.3)',
            padding: '20px',
            animation: 'slideUp 0.3s ease-out',
          }}>
            <div style={{
              color: 'white',
              marginBottom: '16px',
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span>🧙‍♂️</span>
                <span>AI Assistant</span>
              </div>
              <div style={{
                fontSize: '13px',
                opacity: 0.9,
              }}>
                Tell me what you'd like to create or arrange
              </div>
            </div>

            {/* Suggestions */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '16px',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '8px',
                fontWeight: '600',
              }}>
                Try these:
              </div>
              {[
                'Create 3 yellow sticky notes with ideas for our project',
                'Arrange all sticky notes in a 2x2 grid',
                'Create a SWOT analysis with 4 frames',
                'Move all pink notes to the right',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAiInput(suggestion);
                    processAICommand();
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    marginBottom: idx < 3 ? '8px' : '0',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isProcessing && aiInput.trim()) {
                    processAICommand();
                  }
                }}
                placeholder="Or type your own request..."
                disabled={isProcessing}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  outline: 'none',
                }}
              />
              <button
                onClick={processAICommand}
                disabled={isProcessing || !aiInput.trim()}
                style={{
                  padding: '12px 16px',
                  background: isProcessing ? 'rgba(255, 255, 255, 0.5)' : 'white',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isProcessing || !aiInput.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            {/* AI Response */}
            {aiResponse && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#667eea',
              }}>
                {aiResponse}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Left Toolbar - Floating */}
        <div style={{
          position: 'absolute',
          left: '16px',
          top: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10
        }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px',
          gap: '4px',
          alignItems: 'center',
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

          {/* Color Picker - shows when drawing tool is active */}
          {(activeTool === 'pen' || activeTool === 'arrow' || activeTool === 'line') && (
            <>
              <div style={{
                width: '100%',
                height: '1px',
                background: '#e0e0e0',
                margin: '8px 0'
              }} />

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                padding: '4px'
              }}>
                {[
                  '#000000', '#FF5252', '#FF9800',
                  '#FFEB3B', '#4CAF50', '#2196F3',
                  '#9C27B0', '#E91E63', '#FFFFFF'
                ].map(color => (
                  <button
                    key={color}
                    onClick={() => setDrawColor(color)}
                    title={color}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      background: color,
                      border: drawColor === color ? '3px solid #2196F3' : color === '#FFFFFF' ? '2px solid #ddd' : '2px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </div>
            </>
          )}

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

          {/* Undo / Redo - separate panel below the toolbar */}
          <div style={{
            background: 'white',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            padding: '6px',
            gap: '4px',
            alignItems: 'center',
          }}>
            {[
              { action: handleUndo, icon: Undo, label: 'Undo (⌘Z)', enabled: historyIndex > 0 },
              { action: handleRedo, icon: Redo, label: 'Redo (⌘⇧Z)', enabled: historyIndex < history.length - 1 },
            ].map(({ action, icon: Icon, label, enabled }) => (
              <button
                key={label}
                onClick={enabled ? action : undefined}
                title={label}
                disabled={!enabled}
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: enabled ? '#333' : '#ccc',
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (enabled) e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>
        </div>

        {/* Zoom Control - bottom right */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '4px',
        }}>
          {/* Zoom preset popup */}
          {showZoomMenu && (
            <div style={{
              background: 'white',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              minWidth: '180px',
            }}>
              {/* Fit to screen */}
              <button
                onClick={() => { fitToScreen(); setShowZoomMenu(false); }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#333',
                  textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Maximize2 size={15} color="#666" />
                Fit to screen
              </button>
              {/* Zoom presets */}
              {[2, 1.5, 1, 0.5].map(level => (
                <button
                  key={level}
                  onClick={() => { setZoom(level); setShowZoomMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: Math.round(zoom * 100) === Math.round(level * 100) ? '#f0f4ff' : 'none',
                    border: 'none',
                    borderBottom: level !== 0.5 ? '1px solid #f0f0f0' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: Math.round(zoom * 100) === Math.round(level * 100) ? '#667eea' : '#333',
                    fontWeight: Math.round(zoom * 100) === Math.round(level * 100) ? '600' : '400',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (Math.round(zoom * 100) !== Math.round(level * 100)) e.currentTarget.style.background = '#f5f5f5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = Math.round(zoom * 100) === Math.round(level * 100) ? '#f0f4ff' : 'none'; }}
                >
                  <Plus size={15} color="#aaa" />
                  {Math.round(level * 100)}%
                </button>
              ))}
            </div>
          )}

          {/* Zoom bar */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
          }}>
            <button
              onClick={zoomOut}
              title="Zoom out"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                borderRight: '1px solid #eee',
                cursor: 'pointer',
                color: '#555',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => setShowZoomMenu(prev => !prev)}
              title="Zoom options"
              style={{
                padding: '0 12px',
                height: '36px',
                background: showZoomMenu ? '#f0f4ff' : 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                color: showZoomMenu ? '#667eea' : '#333',
                minWidth: '58px',
                letterSpacing: '-0.3px',
              }}
              onMouseEnter={e => { if (!showZoomMenu) e.currentTarget.style.background = '#f5f5f5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = showZoomMenu ? '#f0f4ff' : 'none'; }}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={zoomIn}
              title="Zoom in"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                borderLeft: '1px solid #eee',
                cursor: 'pointer',
                color: '#555',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Plus size={16} />
            </button>
          </div>
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

          {/* Drawing Preview - Path */}
          {isDrawing && currentPath.length > 1 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '5000px',
                height: '5000px',
                pointerEvents: 'none',
                overflow: 'visible'
              }}
            >
              <path
                d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                stroke={drawColor}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
              />
            </svg>
          )}

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

      {/* Bottom Bar */}
      <div style={{
        padding: '8px 16px',
        background: 'white',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        fontSize: '12px',
        color: '#999',
        userSelect: 'none',
      }}>
        <div>{boardObjects.length} object{boardObjects.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float-sparkle-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-10px, -20px) scale(1.2);
            opacity: 0.6;
          }
        }

        @keyframes float-sparkle-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(10px, -15px) scale(1.3);
            opacity: 0.7;
          }
        }

        @keyframes float-sparkle-3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-15px, 10px) scale(1.1);
            opacity: 0.5;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AIBoard;
