import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2, Trash2, MousePointer, Hand, Pen, StickyNote, Type, Square, Circle, Triangle, Diamond, Hexagon, Star, ArrowRight, Minus, ArrowLeft, Share2, Cloud, CloudOff, Loader, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, Undo, Redo, Plus, Maximize2, Users, Shapes, Bold, AlignLeft, AlignCenter, Eraser, Moon, Sun } from 'lucide-react';
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
  const [isBoardPublic, setIsBoardPublic] = useState(true);
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isWizardHovered, setIsWizardHovered] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [drawColor, setDrawColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [lineStart, setLineStart] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [stickyColor, setStickyColor] = useState('yellow');
  const [shapeType, setShapeType] = useState('rectangle');
  const [showStickyMenu, setShowStickyMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserPos, setEraserPos] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('boardDarkMode') !== 'false');

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('boardDarkMode', String(next));
      return next;
    });
  }, []);

  const theme = darkMode ? {
    bg: '#1a1a2e',
    surface: '#16213e',
    surfaceHover: '#1a2744',
    border: '#2a3a5c',
    borderLight: '#243352',
    text: '#e0e0f0',
    textSecondary: '#8892b0',
    textMuted: '#5a6688',
    gridLine: '#243352',
    divider: '#2a3a5c',
    canvasBg: '#0f1626',
    inputFocusBg: '#1a2744',
  } : {
    bg: '#f5f5f5',
    surface: 'white',
    surfaceHover: '#f5f5f5',
    border: '#e0e0e0',
    borderLight: '#eee',
    text: '#333',
    textSecondary: '#666',
    textMuted: '#999',
    gridLine: '#e8e8e8',
    divider: '#e0e0e0',
    canvasBg: '#f5f5f5',
    inputFocusBg: '#f5f5f5',
  };

  const canvasRef = useRef(null);
  const wheelListenerRef = useRef(null);
  const nextId = useRef(1);
  const prevUserCount = useRef(0);

  const pointToSegmentDist = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };

  const eraseAtPoint = (x, y) => {
    const threshold = 12;
    setBoardObjects(prev => {
      const result = [];
      for (const obj of prev) {
        if (obj.type === 'path' && obj.points?.length >= 2) {
          // Find which segments are hit
          const hitSegments = new Set();
          for (let i = 0; i < obj.points.length - 1; i++) {
            if (pointToSegmentDist(x, y, obj.points[i].x, obj.points[i].y, obj.points[i + 1].x, obj.points[i + 1].y) < threshold) {
              hitSegments.add(i);
            }
          }
          if (hitSegments.size === 0) {
            result.push(obj);
          } else {
            // Split path into segments that weren't erased
            let run = [];
            for (let i = 0; i < obj.points.length; i++) {
              const segBefore = i - 1;
              const segAfter = i;
              const beforeHit = segBefore >= 0 && hitSegments.has(segBefore);
              const afterHit = segAfter < obj.points.length - 1 && hitSegments.has(segAfter);

              if (beforeHit && afterHit) {
                // Point is between two erased segments, skip it
                continue;
              }
              if (beforeHit) {
                // Ending an erased zone, start a new run
                if (run.length >= 2) {
                  result.push({ ...obj, id: nextId.current++, points: run });
                }
                run = [obj.points[i]];
              } else if (afterHit) {
                // About to enter an erased zone, finish this run
                run.push(obj.points[i]);
                if (run.length >= 2) {
                  result.push({ ...obj, id: nextId.current++, points: run });
                }
                run = [];
              } else {
                run.push(obj.points[i]);
              }
            }
            if (run.length >= 2) {
              result.push({ ...obj, id: nextId.current++, points: run });
            }
          }
        } else if (obj.type === 'line' || obj.type === 'arrow') {
          const x1 = obj.x1, y1 = obj.y1, x2 = obj.x2, y2 = obj.y2;
          if (pointToSegmentDist(x, y, x1, y1, x2, y2) >= threshold) {
            result.push(obj);
          }
        } else {
          result.push(obj);
        }
      }
      return result;
    });
  };

  const getObjBounds = (obj) => {
    if (obj.type === 'path' && obj.points?.length) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of obj.points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    if (obj.type === 'line' || obj.type === 'arrow') {
      const x = Math.min(obj.x1, obj.x2), y = Math.min(obj.y1, obj.y2);
      return { x, y, w: Math.abs(obj.x2 - obj.x1), h: Math.abs(obj.y2 - obj.y1) };
    }
    return { x: obj.x || 0, y: obj.y || 0, w: obj.width || 100, h: obj.height || 100 };
  };

  const boxesIntersect = (a, b) => {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  // Real-time board sync
  useBoardSync(boardId, boardObjects, setBoardObjects, user);

  // Confetti when a second person joins
  useEffect(() => {
    const uniqueCount = new Set(onlineUsers.map(u => u.user_id)).size;
    if (prevUserCount.current <= 1 && uniqueCount >= 2) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
    prevUserCount.current = uniqueCount;
  }, [onlineUsers]);

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
        setIsBoardPublic(board.is_public !== false);
        if (board.board_data) {
          const data = typeof board.board_data === 'string'
            ? JSON.parse(board.board_data)
            : board.board_data;
          const objs = data.objects || [];
          setBoardObjects(objs);
          nextId.current = data.nextId || (objs.length ? Math.max(...objs.map(o => o.id)) + 1 : 1);

          // Center viewport on content
          if (objs.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const obj of objs) {
              const b = getObjBounds(obj);
              minX = Math.min(minX, b.x);
              minY = Math.min(minY, b.y);
              maxX = Math.max(maxX, b.x + b.w);
              maxY = Math.max(maxY, b.y + b.h);
            }
            const contentW = maxX - minX;
            const contentH = maxY - minY;
            const centerX = minX + contentW / 2;
            const centerY = minY + contentH / 2;
            const vw = window.innerWidth - 80;
            const vh = window.innerHeight - 60;
            setViewportOffset({
              x: vw / 2 - centerX,
              y: vh / 2 - centerY,
            });
          }
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
    if (e.button === 1 || (e.button === 0 && e.shiftKey) || (e.button === 0 && activeTool === 'hand')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewportOffset.x, y: e.clientY - viewportOffset.y });
      e.preventDefault();
      return;
    }

    if (objId) {
      const isMultiKey = e.metaKey || e.ctrlKey;
      if (isMultiKey) {
        // Toggle this object in/out of multi-selection
        setSelectedIds(prev => prev.includes(objId) ? prev.filter(id => id !== objId) : [...prev, objId]);
        setSelectedId(prev => prev === objId ? null : objId);
        e.stopPropagation();
        return;
      }
      // If clicking an object that's already in a multi-selection, drag all of them
      if (selectedIds.includes(objId) && selectedIds.length > 1) {
        setDraggedId(objId);
        const obj = boardObjects.find(o => o.id === objId);
        if (obj) {
          setDragOffset({
            x: (e.clientX - viewportOffset.x) / zoom - obj.x,
            y: (e.clientY - viewportOffset.y) / zoom - obj.y
          });
        }
        e.stopPropagation();
        return;
      }
      // Single click without modifier — single select
      setDraggedId(objId);
      setSelectedId(objId);
      setSelectedIds([objId]);
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
      setSelectedIds([]);

      // Start selection box when in select mode on empty canvas
      if (activeTool === 'select') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
          const y = (e.clientY - rect.top - viewportOffset.y) / zoom;
          setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        }
      }

      // Handle drawing tools
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && (activeTool === 'pen' || activeTool === 'eraser' || activeTool === 'arrow' || activeTool === 'line')) {
        const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
        const y = (e.clientY - rect.top - viewportOffset.y) / zoom;

        if (activeTool === 'pen') {
          setIsDrawing(true);
          setCurrentPath([{ x, y }]);
        } else if (activeTool === 'eraser') {
          setIsErasing(true);
          eraseAtPoint(x, y);
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

    if (activeTool === 'eraser') {
      setEraserPos({ x: e.clientX, y: e.clientY });
    } else if (eraserPos) {
      setEraserPos(null);
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

    // Handle eraser
    if (isErasing && activeTool === 'eraser' && rect) {
      const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
      const y = (e.clientY - rect.top - viewportOffset.y) / zoom;
      eraseAtPoint(x, y);
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

    // Selection box dragging
    if (selectionBox && activeTool === 'select' && !draggedId && rect) {
      const x = (e.clientX - rect.left - viewportOffset.x) / zoom;
      const y = (e.clientY - rect.top - viewportOffset.y) / zoom;
      setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
      return;
    }

    if (draggedId) {
      const newX = (e.clientX - viewportOffset.x) / zoom - dragOffset.x;
      const newY = (e.clientY - viewportOffset.y) / zoom - dragOffset.y;

      // Multi-drag: move all selected objects together
      if (selectedIds.length > 1 && selectedIds.includes(draggedId)) {
        const draggedObj = boardObjects.find(o => o.id === draggedId);
        if (draggedObj) {
          const dx = newX - draggedObj.x;
          const dy = newY - draggedObj.y;
          setBoardObjects(prev => prev.map(obj => {
            if (!selectedIds.includes(obj.id)) return obj;
            if (obj.type === 'line' || obj.type === 'arrow') {
              return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
            }
            if (obj.type === 'path') {
              return { ...obj, points: obj.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            }
            return { ...obj, x: obj.x + dx, y: obj.y + dy };
          }));
        }
      } else {
        setBoardObjects(prev => prev.map(obj =>
          obj.id === draggedId ? { ...obj, x: newX, y: newY } : obj
        ));
      }
    }
  };

  const handleMouseUp = (e) => {
    // Finish selection box
    if (selectionBox) {
      const sx = Math.min(selectionBox.startX, selectionBox.endX);
      const sy = Math.min(selectionBox.startY, selectionBox.endY);
      const sw = Math.abs(selectionBox.endX - selectionBox.startX);
      const sh = Math.abs(selectionBox.endY - selectionBox.startY);
      if (sw > 5 || sh > 5) {
        const box = { x: sx, y: sy, w: sw, h: sh };
        const hits = boardObjects.filter(obj => boxesIntersect(getObjBounds(obj), box)).map(obj => obj.id);
        setSelectedIds(hits);
        setSelectedId(hits.length === 1 ? hits[0] : null);
      }
      setSelectionBox(null);
    }

    // Finish erasing
    if (isErasing) {
      setIsErasing(false);
    }

    // Finish pen drawing
    if (isDrawing && activeTool === 'pen' && currentPath.length > 1) {
      const newPath = {
        id: nextId.current++,
        type: 'path',
        points: currentPath,
        color: drawColor,
        strokeWidth: strokeWidth
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
          strokeWidth: strokeWidth
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

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Pinch-to-zoom on trackpad fires as ctrlKey + wheel
    if (e.ctrlKey) {
      const sensitivity = 0.005;
      const scaleFactor = 1 - e.deltaY * sensitivity;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom(prev => {
        const newZoom = Math.min(Math.max(prev * scaleFactor, 0.1), 3);
        const ratio = newZoom / prev;
        setViewportOffset(off => ({
          x: mouseX - ratio * (mouseX - off.x),
          y: mouseY - ratio * (mouseY - off.y),
        }));
        return newZoom;
      });
      return;
    }

    // Regular scroll wheel zoom — gentle step
    const delta = e.deltaY > 0 ? 0.97 : 1.03;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom(prev => {
      const newZoom = Math.min(Math.max(prev * delta, 0.1), 3);
      const ratio = newZoom / prev;
      setViewportOffset(off => ({
        x: mouseX - ratio * (mouseX - off.x),
        y: mouseY - ratio * (mouseY - off.y),
      }));
      return newZoom;
    });
  }, []);

  // Delete selected object(s)
  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      const idsToRemove = new Set(selectedIds);
      setBoardObjects(prev => prev.filter(obj => !idsToRemove.has(obj.id)));
      setSelectedId(null);
      setSelectedIds([]);
    } else if (selectedId) {
      setBoardObjects(prev => prev.filter(obj => obj.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId, selectedIds]);

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
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedId || selectedIds.length > 0)) {
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
  }, [selectedId, selectedIds, handleDelete, handleUndo, handleRedo]);

  // Callback ref to attach wheel listener as non-passive so preventDefault works
  const canvasRefCallback = useCallback((el) => {
    // Detach from previous element
    if (wheelListenerRef.current) {
      wheelListenerRef.current.removeEventListener('wheel', handleWheel);
    }
    canvasRef.current = el;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      wheelListenerRef.current = el;
    } else {
      wheelListenerRef.current = null;
    }
  }, [handleWheel]);

  // Close zoom menu on outside click
  useEffect(() => {
    if (!showZoomMenu) return;
    const close = () => setShowZoomMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showZoomMenu]);

  // Tool handlers
  const handleCanvasClick = (e) => {
    setShowStickyMenu(false);
    setShowShapeMenu(false);
    if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'pen' || activeTool === 'eraser' || activeTool === 'arrow' || activeTool === 'line' || draggedId || isPanning) return;

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
        color: stickyColor,
        text: ''
      };
      setBoardObjects(prev => [...prev, newNote]);
      setEditingId(newNote.id);
      setEditingText('');
      setActiveTool('select');
    } else if (activeTool === 'text') {
      const newText = {
        id: nextId.current++,
        type: 'text',
        x,
        y,
        width: 200,
        height: 50,
        text: ''
      };
      setBoardObjects(prev => [...prev, newText]);
      setEditingId(newText.id);
      setEditingText('');
      setActiveTool('select');
    } else if (activeTool === 'shape') {
      const newShape = {
        id: nextId.current++,
        type: 'shape',
        shapeType: shapeType,
        x,
        y,
        width: shapeType === 'circle' ? 120 : 150,
        height: shapeType === 'circle' ? 120 : shapeType === 'triangle' ? 130 : 100,
        color: '#81D4FA'
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

  const updateStickyProp = (id, prop, value) => {
    setBoardObjects(prev => prev.map(o => o.id === id ? { ...o, [prop]: value } : o));
  };

  const STICKY_COLORS = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
  const FONT_SIZES = [
    { label: 'S', value: 13 },
    { label: 'M', value: 16 },
    { label: 'L', value: 22 },
  ];

  // Render board object
  const renderObject = (obj) => {
    const isSelected = obj.id === selectedId || selectedIds.includes(obj.id);
    const isEditing = obj.id === editingId;

    if (obj.type === 'stickyNote') {
      const noteFontSize = obj.fontSize || 14;
      const noteBold = obj.fontWeight === 'bold';
      const noteAlign = obj.textAlign || 'left';
      const showToolbar = isSelected || isEditing;

      return (
        <div key={obj.id} style={{ position: 'absolute', left: obj.x, top: obj.y }}>
          {/* Sticky toolbar */}
          {showToolbar && (
            <div
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: 'rgba(30,30,40,0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                padding: '4px 6px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                zIndex: 100,
              }}
            >
              {/* Font size buttons */}
              {FONT_SIZES.map(fs => (
                <button
                  key={fs.label}
                  onClick={() => updateStickyProp(obj.id, 'fontSize', fs.value)}
                  style={{
                    width: '26px', height: '26px',
                    border: 'none', borderRadius: '6px',
                    background: noteFontSize === fs.value ? 'rgba(56,189,248,0.2)' : 'transparent',
                    color: noteFontSize === fs.value ? '#38bdf8' : '#94a3b8',
                    fontSize: '11px', fontWeight: '700',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  title={`Font size ${fs.label}`}
                >
                  {fs.label}
                </button>
              ))}

              {/* Divider */}
              <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

              {/* Bold */}
              <button
                onClick={() => updateStickyProp(obj.id, 'fontWeight', noteBold ? 'normal' : 'bold')}
                style={{
                  width: '26px', height: '26px',
                  border: 'none', borderRadius: '6px',
                  background: noteBold ? 'rgba(56,189,248,0.2)' : 'transparent',
                  color: noteBold ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                title="Bold"
              >
                <Bold size={13} />
              </button>

              {/* Align left */}
              <button
                onClick={() => updateStickyProp(obj.id, 'textAlign', 'left')}
                style={{
                  width: '26px', height: '26px',
                  border: 'none', borderRadius: '6px',
                  background: noteAlign === 'left' ? 'rgba(56,189,248,0.2)' : 'transparent',
                  color: noteAlign === 'left' ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                title="Align left"
              >
                <AlignLeft size={13} />
              </button>

              {/* Align center */}
              <button
                onClick={() => updateStickyProp(obj.id, 'textAlign', 'center')}
                style={{
                  width: '26px', height: '26px',
                  border: 'none', borderRadius: '6px',
                  background: noteAlign === 'center' ? 'rgba(56,189,248,0.2)' : 'transparent',
                  color: noteAlign === 'center' ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                title="Align center"
              >
                <AlignCenter size={13} />
              </button>

              {/* Divider */}
              <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

              {/* Color dots */}
              {STICKY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => updateStickyProp(obj.id, 'color', c)}
                  style={{
                    width: '18px', height: '18px',
                    borderRadius: '50%',
                    border: obj.color === c ? '2px solid #fff' : '2px solid transparent',
                    background: getColor(c),
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: obj.color === c ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Sticky note body */}
          <div
            onMouseDown={(e) => {
              if (!isEditing) handleMouseDown(e, obj.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!isEditing) {
                setEditingId(obj.id);
                setEditingText(obj.text);
              }
            }}
            style={{
              width: obj.width,
              height: obj.height,
              backgroundColor: getColor(obj.color),
              border: isSelected ? '3px solid #2196F3' : '1px solid rgba(0,0,0,0.08)',
              borderRadius: '2px 2px 4px 4px',
              padding: '16px',
              cursor: isEditing ? 'text' : 'move',
              boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 4px 6px rgba(0,0,0,0.06), 0 10px 14px -4px rgba(0,0,0,0.1), 2px 12px 16px -2px rgba(0,0,0,0.08)',
              fontSize: `${noteFontSize}px`,
              fontWeight: obj.fontWeight || 'normal',
              textAlign: noteAlign,
              overflow: 'auto',
              userSelect: isEditing ? 'text' : 'none',
              boxSizing: 'border-box',
              position: 'relative',
            }}>
            {/* Top tape/pin strip */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 100%)',
              borderRadius: '2px 2px 0 0',
              pointerEvents: 'none',
            }} />
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
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  textAlign: 'inherit',
                  fontFamily: 'inherit',
                  resize: 'none',
                  color: 'inherit',
                }}
              />
            ) : (
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{obj.text}</span>
            )}
          </div>
        </div>
      );
    }
    
    if (obj.type === 'shape') {
      const w = obj.width || 100;
      const h = obj.height || 100;
      const fillColor = getColor(obj.color);
      const userStrokeW = obj.strokeWidth ?? 2;
      const strokeColor = isSelected ? '#2196F3' : (obj.strokeColor || 'rgba(0,0,0,0.3)');
      const strokeW = isSelected ? Math.max(userStrokeW, 3) : userStrokeW;

      const SHAPE_COLORS = [
        { name: 'yellow', hex: '#FFF59D' },
        { name: 'pink', hex: '#F48FB1' },
        { name: 'blue', hex: '#81D4FA' },
        { name: 'green', hex: '#A5D6A7' },
        { name: 'purple', hex: '#CE93D8' },
        { name: 'orange', hex: '#FFAB91' },
        { name: 'white', hex: '#FFFFFF' },
      ];
      const STROKE_SIZES = [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '4', value: 4 },
        { label: '6', value: 6 },
      ];

      const getShapePath = () => {
        switch (obj.shapeType) {
          case 'circle':
            return <ellipse cx={w/2} cy={h/2} rx={w/2 - 2} ry={h/2 - 2} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} />;
          case 'triangle':
            return <polygon points={`${w/2},2 ${w-2},${h-2} 2,${h-2}`} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />;
          case 'diamond':
            return <polygon points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />;
          case 'hexagon': {
            const cx = w/2, cy = h/2, rx = w/2 - 2, ry = h/2 - 2;
            const pts = Array.from({length: 6}, (_, i) => {
              const a = Math.PI / 3 * i - Math.PI / 2;
              return `${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`;
            }).join(' ');
            return <polygon points={pts} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />;
          }
          case 'star': {
            const cx = w/2, cy = h/2, outer = Math.min(w, h)/2 - 2, inner = outer * 0.4;
            const pts = Array.from({length: 10}, (_, i) => {
              const a = Math.PI / 5 * i - Math.PI / 2;
              const r = i % 2 === 0 ? outer : inner;
              return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
            }).join(' ');
            return <polygon points={pts} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />;
          }
          default: // rectangle
            return <rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} />;
        }
      };

      return (
        <div
          key={obj.id}
          style={{
            position: 'absolute',
            left: obj.x,
            top: obj.y,
            width: w,
            height: h
          }}
        >
          {/* Shape toolbar */}
          {isSelected && (
            <div
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: 'rgba(30,30,40,0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                padding: '4px 6px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                zIndex: 100,
              }}
            >
              {/* Color dots */}
              {SHAPE_COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => updateStickyProp(obj.id, 'color', c.name)}
                  style={{
                    width: '18px', height: '18px',
                    borderRadius: '50%',
                    border: obj.color === c.name ? '2px solid #fff' : '2px solid transparent',
                    background: c.hex,
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: obj.color === c.name ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}
                  title={c.name}
                />
              ))}

              {/* Divider */}
              <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

              {/* Stroke thickness */}
              {STROKE_SIZES.map(s => (
                <button
                  key={s.value}
                  onClick={() => updateStickyProp(obj.id, 'strokeWidth', s.value)}
                  style={{
                    width: '26px', height: '26px',
                    border: 'none', borderRadius: '6px',
                    background: userStrokeW === s.value ? 'rgba(56,189,248,0.2)' : 'transparent',
                    color: userStrokeW === s.value ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    padding: 0,
                  }}
                  title={`Stroke ${s.value}px`}
                >
                  <div style={{
                    width: '14px',
                    height: `${Math.max(s.value, 1)}px`,
                    background: userStrokeW === s.value ? '#38bdf8' : '#94a3b8',
                    borderRadius: '1px',
                  }} />
                </button>
              ))}
            </div>
          )}

          <svg
            width={w} height={h}
            onMouseDown={(e) => handleMouseDown(e, obj.id)}
            style={{ cursor: 'move', display: 'block' }}
          >
            {getShapePath()}
          </svg>
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
            if (!isEditing) {
              setEditingId(obj.id);
              setEditingText(obj.text);
            }
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
            color: theme.text,
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
                color: theme.text
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
            border: isSelected ? '3px solid #2196F3' : `2px dashed ${theme.textSecondary}`,
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
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg }}>
      {/* Board Header */}
      <div style={{
        padding: '10px 16px',
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
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
            border: `1px solid ${theme.borderLight}`,
            borderRadius: '6px',
            cursor: 'pointer',
            color: theme.textSecondary,
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
            color: theme.text,
            padding: '4px 8px',
            borderRadius: '4px',
            background: 'transparent',
            minWidth: '200px',
          }}
          onFocus={(e) => e.target.style.background = theme.inputFocusBg}
          onBlurCapture={(e) => e.target.style.background = 'transparent'}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: saveStatus === 'saved' ? '#4caf50' : saveStatus === 'saving' ? '#ff9800' : saveStatus === 'error' ? '#f44336' : theme.textMuted,
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
          background: theme.surfaceHover,
          borderRadius: '6px',
          fontSize: '12px',
          color: theme.textSecondary,
          fontWeight: '500',
        }}>
          <Users size={13} />
          {onlineUsers.length}
        </div>
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            background: darkMode ? 'rgba(56,189,248,0.15)' : 'none',
            border: `1px solid ${darkMode ? 'rgba(56,189,248,0.3)' : theme.borderLight}`,
            borderRadius: '6px',
            cursor: 'pointer',
            color: darkMode ? '#38bdf8' : theme.textSecondary,
            transition: 'all 0.2s',
          }}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
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
            border: `1px solid ${darkMode ? '#ef5350' : '#f44336'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            color: darkMode ? '#ef5350' : '#f44336',
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
          isPublic={isBoardPublic}
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
          🚀
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
                <span>🚀</span>
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
          background: theme.surface,
          borderRadius: '12px',
          boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px',
          gap: '4px',
          alignItems: 'center',
        }}>
          {[
            { id: 'select', icon: MousePointer, label: 'Select' },
            { id: 'hand', icon: Hand, label: 'Hand' },
            { id: 'pen', icon: Pen, label: 'Draw' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
            { id: 'line', icon: Minus, label: 'Line' }
          ].map(tool => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id); setShowStickyMenu(false); setShowShapeMenu(false); }}
                title={tool.label}
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isActive ? '#2196F3' : 'transparent',
                  color: isActive ? 'white' : theme.textSecondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = theme.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={20} />
              </button>
            );
          })}

          {/* Sticky Note button with color picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setActiveTool('sticky'); setShowStickyMenu(!showStickyMenu); setShowShapeMenu(false); }}
              title="Sticky Note"
              style={{
                width: '44px',
                height: '44px',
                border: 'none',
                borderRadius: '8px',
                background: activeTool === 'sticky' ? '#2196F3' : 'transparent',
                color: activeTool === 'sticky' ? 'white' : theme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeTool !== 'sticky') e.currentTarget.style.background = theme.surfaceHover;
              }}
              onMouseLeave={(e) => {
                if (activeTool !== 'sticky') e.currentTarget.style.background = 'transparent';
              }}
            >
              <StickyNote size={20} />
            </button>
            {showStickyMenu && (
              <div style={{
                position: 'absolute', left: '64px', top: '0',
                background: theme.surface, borderRadius: '12px',
                boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
                padding: '10px',
                zIndex: 20,
                animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'yellow', color: '#FFF59D' },
                    { id: 'pink', color: '#F48FB1' },
                    { id: 'blue', color: '#81D4FA' },
                    { id: 'green', color: '#A5D6A7' },
                    { id: 'purple', color: '#CE93D8' },
                    { id: 'orange', color: '#FFAB91' },
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setStickyColor(c.id); setShowStickyMenu(false); }}
                      style={{
                        width: '28px', height: '28px', borderRadius: '6px',
                        background: c.color, border: stickyColor === c.id ? '3px solid #2196F3' : '2px solid transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
                        padding: 0,
                        transform: stickyColor === c.id ? 'scale(1.15)' : 'scale(1)',
                      }}
                      title={c.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shape button with shape picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setActiveTool('shape'); setShowShapeMenu(!showShapeMenu); setShowStickyMenu(false); }}
              title="Shapes"
              style={{
                width: '44px',
                height: '44px',
                border: 'none',
                borderRadius: '8px',
                background: activeTool === 'shape' ? '#2196F3' : 'transparent',
                color: activeTool === 'shape' ? 'white' : theme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTool !== 'shape') e.currentTarget.style.background = theme.surfaceHover;
              }}
              onMouseLeave={(e) => {
                if (activeTool !== 'shape') e.currentTarget.style.background = 'transparent';
              }}
            >
              <Shapes size={20} />
            </button>
            {showShapeMenu && (
              <div style={{
                position: 'absolute', left: '64px', top: '0',
                background: theme.surface, borderRadius: '12px',
                boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
                padding: '10px',
                zIndex: 20,
                animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'rectangle', icon: Square, label: 'Rectangle' },
                    { id: 'circle', icon: Circle, label: 'Circle' },
                    { id: 'triangle', icon: Triangle, label: 'Triangle' },
                    { id: 'diamond', icon: Diamond, label: 'Diamond' },
                    { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
                    { id: 'star', icon: Star, label: 'Star' },
                  ].map(s => {
                    const SIcon = s.icon;
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setShapeType(s.id); setShowShapeMenu(false); }}
                        title={s.label}
                        style={{
                          width: '28px', height: '28px',
                          border: 'none', borderRadius: '6px',
                          background: shapeType === s.id ? (darkMode ? 'rgba(33,150,243,0.15)' : '#e3f2fd') : 'transparent',
                          color: shapeType === s.id ? '#2196F3' : theme.textSecondary,
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                          transform: shapeType === s.id ? 'scale(1.15)' : 'scale(1)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = shapeType === s.id ? (darkMode ? 'rgba(33,150,243,0.15)' : '#e3f2fd') : theme.surfaceHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = shapeType === s.id ? (darkMode ? 'rgba(33,150,243,0.15)' : '#e3f2fd') : 'transparent'; }}
                      >
                        <SIcon size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Layering and Delete buttons - shows when object(s) selected */}
          {(selectedId || selectedIds.length > 0) && (
            <>
              <div style={{
                width: '100%',
                height: '1px',
                background: theme.divider,
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
                  color: theme.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.surfaceHover;
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
                  color: theme.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.surfaceHover;
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
                  color: theme.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.surfaceHover;
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
                  color: theme.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.surfaceHover;
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
                background: theme.divider,
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
            background: theme.surface,
            borderRadius: '10px',
            boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
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
                  color: enabled ? theme.text : (darkMode ? '#3a4a6c' : '#ccc'),
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (enabled) e.currentTarget.style.background = theme.surfaceHover;
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

        {/* Drawing options panel - appears to the right of the toolbar when a drawing tool is active */}
        {(activeTool === 'pen' || activeTool === 'arrow' || activeTool === 'line') && (
          <div style={{
            position: 'absolute',
            left: '88px',
            top: '16px',
            background: theme.surface,
            borderRadius: '12px',
            boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            zIndex: 10,
            animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            {/* Color swatches */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                '#000000', '#FF5252',
                '#FF9800', '#FFEB3B',
                '#4CAF50', '#2196F3',
                '#9C27B0', '#E91E63',
                '#FFFFFF',
              ].map(color => (
                <button
                  key={color}
                  onClick={() => setDrawColor(color)}
                  title={color}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: color,
                    border: drawColor === color ? '3px solid #2196F3' : color === '#FFFFFF' ? `2px solid ${theme.borderLight}` : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.1s',
                    transform: drawColor === color ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: theme.divider }} />

            {/* Stroke width */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              {[2, 4, 8].map(w => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  title={`${w}px`}
                  style={{
                    width: '44px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: strokeWidth === w ? (darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff') : 'transparent',
                    border: strokeWidth === w ? '1.5px solid #667eea' : '1.5px solid transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    padding: '0 6px',
                  }}
                >
                  <div style={{ width: '100%', height: `${w}px`, borderRadius: w, background: drawColor === '#FFFFFF' ? '#ccc' : drawColor }} />
                </button>
              ))}
            </div>
          </div>
        )}

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
              background: theme.surface,
              borderRadius: '12px',
              boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              minWidth: '180px',
              animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
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
                  borderBottom: `1px solid ${theme.divider}`,
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: theme.text,
                  textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Maximize2 size={15} color={theme.textSecondary} />
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
                    background: Math.round(zoom * 100) === Math.round(level * 100) ? (darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff') : 'none',
                    border: 'none',
                    borderBottom: level !== 0.5 ? `1px solid ${theme.divider}` : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: Math.round(zoom * 100) === Math.round(level * 100) ? '#667eea' : theme.text,
                    fontWeight: Math.round(zoom * 100) === Math.round(level * 100) ? '600' : '400',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (Math.round(zoom * 100) !== Math.round(level * 100)) e.currentTarget.style.background = theme.surfaceHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = Math.round(zoom * 100) === Math.round(level * 100) ? (darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff') : 'none'; }}
                >
                  <Plus size={15} color={theme.textMuted} />
                  {Math.round(level * 100)}%
                </button>
              ))}
            </div>
          )}

          {/* Zoom bar */}
          <div style={{
            background: theme.surface,
            borderRadius: '8px',
            boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.12)',
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
                borderRight: `1px solid ${theme.borderLight}`,
                cursor: 'pointer',
                color: theme.textSecondary,
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
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
                background: showZoomMenu ? (darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff') : 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                color: showZoomMenu ? '#667eea' : theme.text,
                minWidth: '58px',
                letterSpacing: '-0.3px',
              }}
              onMouseEnter={e => { if (!showZoomMenu) e.currentTarget.style.background = theme.surfaceHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = showZoomMenu ? (darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff') : 'none'; }}
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
                borderLeft: `1px solid ${theme.borderLight}`,
                cursor: 'pointer',
                color: theme.textSecondary,
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Main Canvas */}
        <div
          ref={canvasRefCallback}
          onMouseDown={handleMouseDown}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}

          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : draggedId ? 'grabbing' : activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : activeTool === 'eraser' ? 'none' : 'crosshair',
            background: `radial-gradient(circle, ${darkMode ? 'rgba(200,220,255,0.25)' : 'rgba(0,0,0,0.15)'} ${darkMode ? '1px' : '1px'}, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
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

          {/* Selection Box */}
          {selectionBox && (
            <div style={{
              position: 'absolute',
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
              border: '2px solid #2196F3',
              background: 'rgba(33,150,243,0.08)',
              borderRadius: '2px',
              pointerEvents: 'none',
            }} />
          )}

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
        background: theme.surface,
        borderTop: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        fontSize: '12px',
        color: theme.textMuted,
        userSelect: 'none',
      }}>
        <div>{boardObjects.length} object{boardObjects.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Eraser cursor */}
      {activeTool === 'eraser' && eraserPos && (
        <div style={{
          position: 'fixed',
          left: eraserPos.x,
          top: eraserPos.y,
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: `2px solid ${theme.textSecondary}`,
          background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 99998,
          transition: 'border-color 0.1s',
          ...(isErasing ? { borderColor: '#f44336', background: 'rgba(244,67,54,0.15)' } : {}),
        }} />
      )}

      {/* Confetti celebration */}
      {showConfetti && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999,
        }}>
          {/* Confetti pieces */}
          {Array.from({ length: 60 }).map((_, i) => {
            const colors = ['#38bdf8', '#818cf8', '#facc15', '#f472b6', '#34d399', '#fb923c', '#a78bfa'];
            const color = colors[i % colors.length];
            const left = Math.random() * 100;
            const delay = Math.random() * 1.5;
            const duration = 2 + Math.random() * 1.5;
            const size = 6 + Math.random() * 6;
            const rotation = Math.random() * 360;
            const isCircle = i % 3 === 0;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `${left}%`,
                top: '-10px',
                width: `${size}px`,
                height: isCircle ? `${size}px` : `${size * 0.6}px`,
                background: color,
                borderRadius: isCircle ? '50%' : '2px',
                animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
                transform: `rotate(${rotation}deg)`,
                opacity: 0,
              }} />
            );
          })}
          {/* Toast message */}
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30,30,40,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '14px',
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'confetti-toast 4s ease forwards',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <span style={{ fontSize: '22px' }}>🎉</span>
            <span style={{
              fontSize: '15px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              The more the merrier!
            </span>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes confetti-toast {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
          10% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.95); }
        }
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

        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateX(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AIBoard;
