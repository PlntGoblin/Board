import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import { useBoard } from './hooks/useBoard';
import { useAutoSave } from './hooks/useAutoSave';
import { usePresence } from './hooks/usePresence';
import { useBoardSync } from './hooks/useBoardSync';
import ShareModal from './components/ShareModal';
import BoardHeader from './components/board/BoardHeader';
import AIChat from './components/board/AIChat';
import Toolbar from './components/board/Toolbar';
import ZoomControls from './components/board/ZoomControls';
import DrawingPanel from './components/board/DrawingPanel';
import Confetti from './components/board/Confetti';
import BoardObject from './components/board/BoardObject';
import { API_URL, ZOOM_MIN, ZOOM_MAX, HISTORY_MAX_DEPTH, CULL_MARGIN } from './lib/config';
import { darkTheme } from './lib/theme';
import { pointToSegmentDist, getObjBounds, boxesIntersect } from './lib/geometry';
import { boardTools } from './lib/boardTools';

const ERASER_THRESHOLD = 12;

const AIBoard = () => {
  const { id: boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadBoard, saveBoard } = useBoard();
  const { onlineUsers, cursors, updateCursor } = usePresence(boardId, user);

  // --- Board state ---
  const [boardObjects, setBoardObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [boardTitle, setBoardTitle] = useState('Untitled Board');
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [isBoardPublic, setIsBoardPublic] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const darkMode = true;

  // --- Tool state ---
  const [activeTool, setActiveTool] = useState('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [drawColor, setDrawColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [lineStart, setLineStart] = useState(null);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserPos, setEraserPos] = useState(null);
  const [stickyColor, setStickyColor] = useState('yellow');
  const [shapeType, setShapeType] = useState('rectangle');
  const [showStickyMenu, setShowStickyMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);

  // --- Edit state ---
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [, setResizeHandle] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [selectionBox, setSelectionBox] = useState(null);

  // --- AI state ---
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [aiResponse, setAiResponse] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const [isWizardHovered, setIsWizardHovered] = useState(false);

  // --- History ---
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);

  // --- UI state ---
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // --- Refs ---
  const canvasRef = useRef(null);
  const wheelListenerRef = useRef(null);
  const nextId = useRef(1);
  const prevUserCount = useRef(0);
  const cachedRect = useRef(null);
  const rafId = useRef(null);
  const rotationStartRef = useRef(null);

  // --- Theme ---
  const theme = darkTheme;

  // Viewport culling: only render objects visible in viewport + buffer
  const { visible: visibleObjects, selectedSet } = useMemo(() => {
    const vLeft = -viewportOffset.x / zoom - CULL_MARGIN;
    const vTop = -viewportOffset.y / zoom - CULL_MARGIN;
    const vRight = (window.innerWidth - viewportOffset.x) / zoom + CULL_MARGIN;
    const vBottom = (window.innerHeight - viewportOffset.y) / zoom + CULL_MARGIN;
    const viewport = { x: vLeft, y: vTop, w: vRight - vLeft, h: vBottom - vTop };

    const visible = boardObjects.filter(obj => boxesIntersect(getObjBounds(obj), viewport));
    const selectedSet = new Set(selectedIds);
    return { visible, selectedSet };
  }, [boardObjects, viewportOffset.x, viewportOffset.y, zoom, selectedIds]);


  // --- Eraser ---
  const eraseAtPoint = (x, y) => {
    setBoardObjects(prev => {
      const result = [];
      for (const obj of prev) {
        if (obj.type === 'path' && obj.points?.length >= 2) {
          const hitSegments = new Set();
          for (let i = 0; i < obj.points.length - 1; i++) {
            if (pointToSegmentDist(x, y, obj.points[i].x, obj.points[i].y, obj.points[i + 1].x, obj.points[i + 1].y) < ERASER_THRESHOLD) {
              hitSegments.add(i);
            }
          }
          if (hitSegments.size === 0) { result.push(obj); continue; }
          let run = [];
          for (let i = 0; i < obj.points.length; i++) {
            const beforeHit = i - 1 >= 0 && hitSegments.has(i - 1);
            const afterHit = i < obj.points.length - 1 && hitSegments.has(i);
            if (beforeHit && afterHit) continue;
            if (beforeHit) {
              if (run.length >= 2) result.push({ ...obj, id: nextId.current++, points: run });
              run = [obj.points[i]];
            } else if (afterHit) {
              run.push(obj.points[i]);
              if (run.length >= 2) result.push({ ...obj, id: nextId.current++, points: run });
              run = [];
            } else {
              run.push(obj.points[i]);
            }
          }
          if (run.length >= 2) result.push({ ...obj, id: nextId.current++, points: run });
        } else if (obj.type === 'line' || obj.type === 'arrow') {
          if (pointToSegmentDist(x, y, obj.x1, obj.y1, obj.x2, obj.y2) >= ERASER_THRESHOLD) result.push(obj);
        } else {
          result.push(obj);
        }
      }
      return result;
    });
  };

  // --- Real-time sync ---
  useBoardSync(boardId, boardObjects, setBoardObjects, user);

  // --- Confetti on second person joining ---
  useEffect(() => {
    const uniqueCount = new Set(onlineUsers.map(u => u.user_id)).size;
    if (prevUserCount.current <= 1 && uniqueCount >= 2) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
    prevUserCount.current = uniqueCount;
  }, [onlineUsers]);

  // --- Auto-save ---
  const saveStatus = useAutoSave(boardId, boardObjects, nextId.current, boardLoaded ? saveBoard : null);

  // --- Undo/redo history ---
  useEffect(() => {
    if (!boardLoaded) return;
    if (isUndoRedo.current) { isUndoRedo.current = false; return; }
    setHistory(prev => {
      const next = [...prev.slice(0, historyIndex + 1), boardObjects];
      return next.length > HISTORY_MAX_DEPTH ? next.slice(next.length - HISTORY_MAX_DEPTH) : next;
    });
    setHistoryIndex(prev => Math.min(prev + 1, HISTORY_MAX_DEPTH - 1));
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

  // --- Load board on mount ---
  useEffect(() => {
    if (!boardId) return;
    const load = async () => {
      try {
        const board = await loadBoard(boardId);
        setBoardTitle(board.title || 'Untitled Board');
        setIsBoardPublic(board.is_public !== false);
        if (board.board_data) {
          const data = typeof board.board_data === 'string' ? JSON.parse(board.board_data) : board.board_data;
          const objs = data.objects || [];
          setBoardObjects(objs);
          nextId.current = data.nextId || (objs.length ? Math.max(...objs.map(o => o.id)) + 1 : 1);
          if (objs.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const obj of objs) {
              const b = getObjBounds(obj);
              minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
              maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
            }
            const centerX = minX + (maxX - minX) / 2;
            const centerY = minY + (maxY - minY) / 2;
            setViewportOffset({
              x: (window.innerWidth - 80) / 2 - centerX,
              y: (window.innerHeight - 60) / 2 - centerY,
            });
          }
        }
        setBoardLoaded(true);
      } catch (err) {
        setAccessError(err.message || 'Unable to load this board');
      }
    };
    load();
  }, [boardId]);

  // --- Zoom ---
  const zoomIn = useCallback(() => setZoom(prev => Math.min(+(prev * 1.25).toFixed(2), ZOOM_MAX)), []);
  const zoomOut = useCallback(() => setZoom(prev => Math.max(+(prev / 1.25).toFixed(2), ZOOM_MIN)), []);
  const fitToScreen = useCallback(() => { setZoom(1); setViewportOffset({ x: 0, y: 0 }); }, []);

  // --- AI tool execution ---
  const executeToolCall = useCallback((toolName, toolInput) => {
    switch (toolName) {
      case "createStickyNote": {
        const n = { id: nextId.current++, type: 'stickyNote', x: toolInput.x, y: toolInput.y, width: 200, height: 200, color: toolInput.color, text: toolInput.text };
        setBoardObjects(prev => [...prev, n]);
        return { success: true, objectId: n.id };
      }
      case "createShape": {
        const n = { id: nextId.current++, type: 'shape', shapeType: toolInput.type, x: toolInput.x, y: toolInput.y, width: toolInput.width, height: toolInput.height, color: toolInput.color };
        setBoardObjects(prev => [...prev, n]);
        return { success: true, objectId: n.id };
      }
      case "createFrame": {
        const n = { id: nextId.current++, type: 'frame', x: toolInput.x, y: toolInput.y, width: toolInput.width, height: toolInput.height, title: toolInput.title };
        setBoardObjects(prev => [...prev, n]);
        return { success: true, objectId: n.id };
      }
      case "createConnector": {
        const fromObj = boardObjects.find(o => o.id === toolInput.fromId);
        const toObj = boardObjects.find(o => o.id === toolInput.toId);
        if (!fromObj || !toObj) return { success: false, error: `Object not found: ${!fromObj ? toolInput.fromId : toolInput.toId}` };
        const fromCenterX = fromObj.x + (fromObj.width || 200) / 2;
        const fromCenterY = fromObj.y + (fromObj.height || 200) / 2;
        const toCenterX = toObj.x + (toObj.width || 200) / 2;
        const toCenterY = toObj.y + (toObj.height || 200) / 2;
        const connectorType = toolInput.style === 'line' || toolInput.style === 'dashed' ? 'line' : 'arrow';
        const n = {
          id: nextId.current++, type: connectorType,
          x1: fromCenterX, y1: fromCenterY, x2: toCenterX, y2: toCenterY,
          color: toolInput.color || '#ffffff', strokeWidth: 2,
          fromId: toolInput.fromId, toId: toolInput.toId,
          ...(toolInput.style === 'dashed' ? { strokeDasharray: '8 4' } : {}),
        };
        setBoardObjects(prev => [...prev, n]);
        return { success: true, objectId: n.id, type: connectorType };
      }
      case "moveObject": {
        setBoardObjects(prev => prev.map(obj => toolInput.objectIds.includes(obj.id)
          ? { ...obj, x: toolInput.relative ? obj.x + toolInput.x : toolInput.x, y: toolInput.relative ? obj.y + toolInput.y : toolInput.y }
          : obj
        ));
        return { success: true, movedCount: toolInput.objectIds.length };
      }
      case "changeColor": {
        setBoardObjects(prev => prev.map(obj => toolInput.objectIds.includes(obj.id) ? { ...obj, color: toolInput.color } : obj));
        return { success: true, updatedCount: toolInput.objectIds.length };
      }
      case "updateText": {
        setBoardObjects(prev => prev.map(obj => obj.id === toolInput.objectId ? { ...obj, text: toolInput.newText } : obj));
        return { success: true };
      }
      case "arrangeGrid": {
        const count = boardObjects.filter(obj => toolInput.objectIds.includes(obj.id)).length;
        setBoardObjects(prev => prev.map(obj => {
          const idx = toolInput.objectIds.indexOf(obj.id);
          if (idx === -1) return obj;
          return { ...obj, x: toolInput.startX + (idx % toolInput.columns) * (200 + toolInput.spacing), y: toolInput.startY + Math.floor(idx / toolInput.columns) * (200 + toolInput.spacing) };
        }));
        return { success: true, arrangedCount: count };
      }
      case "resizeObject": {
        setBoardObjects(prev => prev.map(obj => toolInput.objectIds.includes(obj.id) ? { ...obj, width: toolInput.width, height: toolInput.height } : obj));
        return { success: true, resizedCount: toolInput.objectIds.length };
      }
      case "createDrawing": {
        if (!toolInput.points?.length || toolInput.points.length < 2) return { success: false, error: 'Need at least 2 points' };
        const n = { id: nextId.current++, type: 'path', points: toolInput.points, color: toolInput.color || '#ffffff', strokeWidth: toolInput.strokeWidth || 3 };
        setBoardObjects(prev => [...prev, n]);
        return { success: true, objectId: n.id };
      }
      case "createText": {
        const n = { id: nextId.current++, type: 'text', x: toolInput.x, y: toolInput.y, width: 200, height: 50, text: toolInput.text };
        setBoardObjects(prev => [...prev, n]);
        return { success: true, objectId: n.id };
      }
      case "getBoardState":
        return { objects: boardObjects.map(({ id, type, x, y, width, height, color, text, title, shapeType, x1, y1, x2, y2, fromId, toId }) => ({ id, type, x, y, width, height, color, text, title, shapeType, ...(x1 !== undefined ? { x1, y1, x2, y2 } : {}), ...(fromId !== undefined ? { fromId, toId } : {}) })) };
      case "zoomToFit": {
        const targets = toolInput.objectIds?.length
          ? boardObjects.filter(obj => toolInput.objectIds.includes(obj.id))
          : boardObjects;
        if (targets.length === 0) return { success: false, error: 'No objects to zoom to' };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const obj of targets) {
          const b = getObjBounds(obj);
          minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
        }
        const pad = 60;
        const contentW = maxX - minX + pad * 2;
        const contentH = maxY - minY + pad * 2;
        const scaleX = window.innerWidth / contentW;
        const scaleY = window.innerHeight / contentH;
        const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), ZOOM_MIN), ZOOM_MAX);
        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;
        setZoom(newZoom);
        setViewportOffset({
          x: window.innerWidth / 2 - centerX * newZoom,
          y: window.innerHeight / 2 - centerY * newZoom,
        });
        return { success: true, zoomedToCount: targets.length };
      }
      case "deleteObjects": {
        const ids = new Set(toolInput.objectIds);
        setBoardObjects(prev => prev.filter(obj => !ids.has(obj.id)));
        return { success: true, deletedCount: toolInput.objectIds.length };
      }
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }, [boardObjects]);

  // --- AI command processing ---
  const systemMessage = {
    role: "system",
    content: `You are an AI assistant that helps users create and manipulate elements on a visual collaboration board (like Miro). Use the provided tools to create sticky notes, shapes, text, frames, connectors, and organize them.

Rules:
- ALWAYS call getBoardState first when the user references existing objects or wants to manipulate the board.
- Prefer modifying existing objects (move, resize, recolor) over deleting and recreating them.
- Never move objects the user didn't ask you to move.
- Understand spatial relationships: an object is "inside" a frame if its x,y position falls within the frame's x,y,width,height bounds.
- When a command is ambiguous, ask the user to clarify before acting.
- When resizing a frame to fit contents: find objects inside/near the frame, calculate their bounding box (min x, min y, max x+width, max y+height), add ~20px padding, then use resizeObject and optionally moveObject on the FRAME only — never move the contents.
- Place new elements at reasonable positions that don't overlap existing ones.
- When arranging in grids, account for object sizes (sticky notes are 200x200, shapes vary).
- Use createConnector to draw arrows or lines between related objects (e.g. journey map stages, flow diagrams).
- Be creative and helpful.

Template Blueprints — when the user asks for one of these, follow the layout precisely:

SWOT Analysis:
- Create 4 frames in a 2x2 grid: "Strengths" (top-left, green sticky), "Weaknesses" (top-right, pink sticky), "Opportunities" (bottom-left, blue sticky), "Threats" (bottom-right, orange sticky).
- Each frame should be ~400x350. Use ~20px gap between frames. Place a placeholder sticky note inside each frame with example text like "Add strengths here...".
- Position: start at x=100, y=100. So: Strengths(100,100), Weaknesses(520,100), Opportunities(100,470), Threats(520,470).

User Journey Map:
- Create a horizontal row of frames for each stage (e.g. 5 stages: "Awareness", "Consideration", "Purchase", "Onboarding", "Retention").
- Each frame ~300x400, spaced horizontally with ~20px gaps.
- Inside each frame, add 2-3 sticky notes for: "User Action" (blue), "Touchpoint" (yellow), "Pain Point" (pink).
- Connect the frames in sequence using createConnector with style "arrow" to show the flow from left to right.

Retrospective Board:
- Create 3 frames side by side: "What Went Well" (green stickies), "What Didn't Go Well" (pink stickies), "Action Items" (blue stickies).
- Each frame ~350x450, spaced horizontally with ~20px gaps. Start at x=100, y=100.
- Place 2-3 placeholder sticky notes inside each frame with example text.

Kanban Board:
- Create 3-4 frames side by side: "To Do", "In Progress", "Review", "Done".
- Each frame ~300x500, spaced horizontally with ~20px gaps.
- Add 2-3 example sticky notes in "To Do" column.

Pro/Con Grid:
- Create a 2-column layout with frames: "Pros" (green stickies) and "Cons" (pink stickies).
- Place placeholder sticky notes inside each.

For any template, always call zoomToFit at the end so the user can see the full result.`,
  };

  const openaiTools = boardTools.map(t => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const processAICommand = async () => {
    if (!aiInput.trim() || isProcessing) return;
    setIsProcessing(true);
    setAiResponse('');
    const userMessage = { role: "user", content: aiInput };
    const newHistory = [...conversationHistory, userMessage];

    try {
      let currentMessages = [systemMessage, ...newHistory];
      let continueProcessing = true;
      let iterations = 0;
      const MAX_ITERATIONS = 10;

      while (continueProcessing && iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`[AI Loop] Iteration ${iterations}`);
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${freshSession?.access_token}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_completion_tokens: 4096,
            tools: openaiTools,
            messages: currentMessages,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'API request failed');

        const choice = data.choices?.[0];
        if (!choice) throw new Error('No response from AI');

        const message = choice.message;

        // Handle text response
        if (message.content) {
          setAiResponse(prev => prev + message.content);
        }

        // Handle tool calls
        if (message.tool_calls?.length) {
          // Append assistant message (only API-safe fields) to history
          const cleanMessage = { role: message.role, tool_calls: message.tool_calls };
          if (message.content) cleanMessage.content = message.content;
          currentMessages = [...currentMessages, cleanMessage];

          for (const toolCall of message.tool_calls) {
            const result = executeToolCall(toolCall.function.name, JSON.parse(toolCall.function.arguments));
            currentMessages = [
              ...currentMessages,
              { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) },
            ];
          }
        }

        console.log(`[AI Loop] finish_reason: ${choice.finish_reason}, tool_calls: ${message.tool_calls?.length || 0}`);
        continueProcessing = choice.finish_reason === 'tool_calls';
        if (!continueProcessing) {
          setConversationHistory([...newHistory, { role: "assistant", content: message.content || '' }]);
        }
      }
      setAiInput('');
    } catch (error) {
      setAiResponse(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Canvas to board coordinate helper ---
  const updateCachedRect = useCallback(() => {
    cachedRect.current = canvasRef.current?.getBoundingClientRect() || null;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateCachedRect);
    return () => window.removeEventListener('resize', updateCachedRect);
  }, [updateCachedRect]);

  const screenToBoard = (e) => {
    const rect = cachedRect.current || canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (e.clientX - rect.left - viewportOffset.x) / zoom, y: (e.clientY - rect.top - viewportOffset.y) / zoom };
  };

  // --- Mouse handlers ---
  const handleMouseDown = (e, objId = null) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey) || (e.button === 0 && activeTool === 'hand')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewportOffset.x, y: e.clientY - viewportOffset.y });
      e.preventDefault();
      return;
    }

    if (objId && CREATION_TOOLS.includes(activeTool)) {
      // Creation tool is active — ignore object interaction, let canvas click handle placement
      return;
    }

    if (objId) {
      const isMultiKey = e.metaKey || e.ctrlKey;
      if (isMultiKey) {
        setSelectedIds(prev => prev.includes(objId) ? prev.filter(id => id !== objId) : [...prev, objId]);
        setSelectedId(prev => prev === objId ? null : objId);
        e.stopPropagation();
        return;
      }
      if (selectedIds.includes(objId) && selectedIds.length > 1) {
        setDraggedId(objId);
        const obj = boardObjects.find(o => o.id === objId);
        if (obj) {
          const ox = obj.x ?? obj.x1 ?? (obj.points?.[0]?.x || 0);
          const oy = obj.y ?? obj.y1 ?? (obj.points?.[0]?.y || 0);
          setDragOffset({ x: (e.clientX - viewportOffset.x) / zoom - ox, y: (e.clientY - viewportOffset.y) / zoom - oy });
        }
        e.stopPropagation();
        return;
      }
      setDraggedId(objId);
      setSelectedId(objId);
      setSelectedIds([objId]);
      const obj = boardObjects.find(o => o.id === objId);
      if (obj) {
        const ox = obj.x ?? obj.x1 ?? (obj.points?.[0]?.x || 0);
        const oy = obj.y ?? obj.y1 ?? (obj.points?.[0]?.y || 0);
        setDragOffset({ x: (e.clientX - viewportOffset.x) / zoom - ox, y: (e.clientY - viewportOffset.y) / zoom - oy });
      }
      e.stopPropagation();
    } else {
      setSelectedId(null);
      setSelectedIds([]);

      if (activeTool === 'select') {
        const pt = screenToBoard(e);
        if (pt) setSelectionBox({ startX: pt.x, startY: pt.y, endX: pt.x, endY: pt.y });
      }

      const pt = screenToBoard(e);
      if (pt && (activeTool === 'pen' || activeTool === 'eraser' || activeTool === 'arrow' || activeTool === 'line')) {
        if (activeTool === 'pen') { setIsDrawing(true); setCurrentPath([pt]); }
        else if (activeTool === 'eraser') { setIsErasing(true); eraseAtPoint(pt.x, pt.y); }
        else if (activeTool === 'arrow' || activeTool === 'line') setLineStart(pt);
      }
    }
  };

  const handleMouseMove = (e) => {
    // Lightweight updates that don't need RAF
    const pt = screenToBoard(e);
    if (pt && updateCursor) updateCursor(pt.x, pt.y);
    if (activeTool === 'eraser') setEraserPos({ x: e.clientX, y: e.clientY });
    else if (eraserPos) setEraserPos(null);

    // Batch heavier state updates via requestAnimationFrame
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const clientX = e.clientX, clientY = e.clientY, shiftKey = e.shiftKey;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;

      if (isPanning) {
        setViewportOffset({ x: clientX - panStart.x, y: clientY - panStart.y });
        return;
      }
      if (isDrawing && activeTool === 'pen' && pt) { setCurrentPath(prev => [...prev, pt]); return; }
      if (isErasing && activeTool === 'eraser' && pt) { eraseAtPoint(pt.x, pt.y); return; }

      if (isRotating && selectedId && selectedIds.length <= 1) {
        const mouseX = (clientX - viewportOffset.x) / zoom;
        const mouseY = (clientY - viewportOffset.y) / zoom;
        setBoardObjects(prev => {
          const primary = prev.find(o => o.id === selectedId);
          if (!primary) return prev;
          const cx = primary.x + (primary.width || 0) / 2;
          const cy = primary.y + (primary.height || 0) / 2;
          const currentAngle = Math.atan2(mouseY - cy, mouseX - cx) * (180 / Math.PI) + 90;
          if (!rotationStartRef.current) {
            rotationStartRef.current = { initialAngle: currentAngle, initialRotation: primary.rotation || 0 };
            return prev;
          }
          let delta = currentAngle - rotationStartRef.current.initialAngle;
          if (shiftKey) delta = Math.round(delta / 15) * 15;
          return prev.map(o =>
            o.id === selectedId ? { ...o, rotation: rotationStartRef.current.initialRotation + delta } : o
          );
        });
        return;
      }

      if (isResizing && selectedId) {
        const mouseX = (clientX - viewportOffset.x) / zoom;
        const mouseY = (clientY - viewportOffset.y) / zoom;
        setBoardObjects(prev => prev.map(obj => {
          if (obj.id !== selectedId) return obj;
          const newWidth = Math.max(50, mouseX - obj.x);
          return { ...obj, width: newWidth, height: Math.max(50, mouseY - obj.y) };
        }));
        return;
      }

      if (selectionBox && activeTool === 'select' && !draggedId && pt) {
        setSelectionBox(prev => prev ? { ...prev, endX: pt.x, endY: pt.y } : null);
        return;
      }

      if (draggedId) {
        const newX = (clientX - viewportOffset.x) / zoom - dragOffset.x;
        const newY = (clientY - viewportOffset.y) / zoom - dragOffset.y;
        if (selectedIds.length > 1 && selectedIds.includes(draggedId)) {
          const draggedObj = boardObjects.find(o => o.id === draggedId);
          if (draggedObj) {
            const dx = newX - draggedObj.x, dy = newY - draggedObj.y;
            setBoardObjects(prev => prev.map(obj => {
              if (!selectedIds.includes(obj.id)) return obj;
              if (obj.type === 'line' || obj.type === 'arrow') return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
              if (obj.type === 'path') return { ...obj, points: obj.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
              return { ...obj, x: obj.x + dx, y: obj.y + dy };
            }));
          }
        } else {
          setBoardObjects(prev => prev.map(obj => {
            if (obj.id !== draggedId) return obj;
            if (obj.type === 'line' || obj.type === 'arrow') {
              const dx = newX - (obj.x1 ?? 0);
              const dy = newY - (obj.y1 ?? 0);
              return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
            }
            if (obj.type === 'path') {
              const dx = newX - (obj.points[0]?.x ?? 0);
              const dy = newY - (obj.points[0]?.y ?? 0);
              return { ...obj, points: obj.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            }
            return { ...obj, x: newX, y: newY };
          }));
        }
      }
    });
  };

  // Cleanup RAF on unmount
  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);

  const handleMouseUp = (e) => {
    if (selectionBox) {
      const sx = Math.min(selectionBox.startX, selectionBox.endX), sy = Math.min(selectionBox.startY, selectionBox.endY);
      const sw = Math.abs(selectionBox.endX - selectionBox.startX), sh = Math.abs(selectionBox.endY - selectionBox.startY);
      if (sw > 5 || sh > 5) {
        const box = { x: sx, y: sy, w: sw, h: sh };
        const hits = boardObjects.filter(obj => boxesIntersect(getObjBounds(obj), box)).map(obj => obj.id);
        setSelectedIds(hits);
        setSelectedId(hits.length === 1 ? hits[0] : null);
      }
      setSelectionBox(null);
    }
    if (isErasing) setIsErasing(false);
    if (isDrawing && activeTool === 'pen' && currentPath.length > 1) {
      setBoardObjects(prev => [...prev, { id: nextId.current++, type: 'path', points: currentPath, color: drawColor, strokeWidth }]);
      setIsDrawing(false); setCurrentPath([]); setActiveTool('select');
    }
    if (lineStart && (activeTool === 'line' || activeTool === 'arrow')) {
      const pt = screenToBoard(e);
      if (pt) {
        setBoardObjects(prev => [...prev, { id: nextId.current++, type: activeTool, x1: lineStart.x, y1: lineStart.y, x2: pt.x, y2: pt.y, color: drawColor, strokeWidth }]);
        setLineStart(null); setActiveTool('select');
      }
    }
    setDraggedId(null); setIsPanning(false); setIsResizing(false); setResizeHandle(null); setIsRotating(false); rotationStartRef.current = null;
  };

  // --- Wheel zoom ---
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey) {
      // Pinch-to-zoom: zoom centered on cursor
      const rect = cachedRect.current || canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
      const factor = 1 - e.deltaY * 0.005;
      setZoom(prev => {
        const newZoom = Math.min(Math.max(prev * factor, ZOOM_MIN), ZOOM_MAX);
        const ratio = newZoom / prev;
        setViewportOffset(off => ({ x: mouseX - ratio * (mouseX - off.x), y: mouseY - ratio * (mouseY - off.y) }));
        return newZoom;
      });
    } else {
      // Two-finger scroll: pan the canvas
      setViewportOffset(off => ({ x: off.x - e.deltaX, y: off.y - e.deltaY }));
    }
  }, []);

  // --- Delete ---
  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      const ids = new Set(selectedIds);
      setBoardObjects(prev => prev.filter(obj => !ids.has(obj.id)));
      setSelectedId(null); setSelectedIds([]);
    } else if (selectedId) {
      setBoardObjects(prev => prev.filter(obj => obj.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId, selectedIds]);

  // --- Layering ---
  const bringToFront = useCallback(() => {
    if (!selectedId) return;
    setBoardObjects(prev => { const obj = prev.find(o => o.id === selectedId); return obj ? [...prev.filter(o => o.id !== selectedId), obj] : prev; });
  }, [selectedId]);

  const sendToBack = useCallback(() => {
    if (!selectedId) return;
    setBoardObjects(prev => { const obj = prev.find(o => o.id === selectedId); return obj ? [obj, ...prev.filter(o => o.id !== selectedId)] : prev; });
  }, [selectedId]);

  const bringForward = useCallback(() => {
    if (!selectedId) return;
    setBoardObjects(prev => {
      const i = prev.findIndex(o => o.id === selectedId);
      if (i === -1 || i === prev.length - 1) return prev;
      const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a;
    });
  }, [selectedId]);

  const sendBackward = useCallback(() => {
    if (!selectedId) return;
    setBoardObjects(prev => {
      const i = prev.findIndex(o => o.id === selectedId);
      if (i <= 0) return prev;
      const a = [...prev]; [a[i], a[i - 1]] = [a[i - 1], a[i]]; return a;
    });
  }, [selectedId]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedId || selectedIds.length > 0)) { e.preventDefault(); handleDelete(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, selectedIds, handleDelete, handleUndo, handleRedo]);

  // --- Wheel listener (non-passive) ---
  const canvasRefCallback = useCallback((el) => {
    if (wheelListenerRef.current) wheelListenerRef.current.removeEventListener('wheel', handleWheel);
    canvasRef.current = el;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      wheelListenerRef.current = el;
      cachedRect.current = el.getBoundingClientRect();
    } else {
      wheelListenerRef.current = null;
      cachedRect.current = null;
    }
  }, [handleWheel]);

  // --- Stable callbacks for child components ---
  const onClear = useCallback(() => {
    if (confirm('Clear all objects from this board?')) {
      setBoardObjects([]); setConversationHistory([]); setAiResponse('');
    }
  }, []);
  const onShare = useCallback(() => setShowShareModal(true), []);

  // --- Close menus on outside click ---
  useEffect(() => {
    if (!showZoomMenu) return;
    const close = () => setShowZoomMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showZoomMenu]);

  // --- Tool change (clears selection so creation tools work on top of objects) ---
  const CREATION_TOOLS = ['text', 'sticky', 'shape', 'frame', 'pen', 'arrow', 'line', 'eraser'];
  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
    if (CREATION_TOOLS.includes(tool)) {
      setSelectedId(null);
      setSelectedIds([]);
      setDraggedId(null);
      setEditingId(null);
    }
  }, []);

  // --- Canvas click (place objects) ---
  const handleCanvasClick = (e) => {
    setShowStickyMenu(false);
    setShowShapeMenu(false);
    if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'pen' || activeTool === 'eraser' || activeTool === 'arrow' || activeTool === 'line' || isPanning) return;
    const pt = screenToBoard(e);
    if (!pt) return;

    if (activeTool === 'sticky') {
      const n = { id: nextId.current++, type: 'stickyNote', x: pt.x, y: pt.y, width: 200, height: 200, color: stickyColor, text: '' };
      setBoardObjects(prev => [...prev, n]);
      setEditingId(n.id); setEditingText(''); setActiveTool('select');
    } else if (activeTool === 'text') {
      const n = { id: nextId.current++, type: 'text', x: pt.x, y: pt.y, width: 200, height: 50, text: '' };
      setBoardObjects(prev => [...prev, n]);
      setEditingId(n.id); setEditingText(''); setActiveTool('select');
    } else if (activeTool === 'shape') {
      const n = {
        id: nextId.current++, type: 'shape', shapeType, x: pt.x, y: pt.y,
        width: shapeType === 'circle' ? 120 : 150,
        height: shapeType === 'circle' ? 120 : shapeType === 'triangle' ? 130 : 100,
        color: '#81D4FA',
      };
      setBoardObjects(prev => [...prev, n]);
      setActiveTool('select');
    } else if (activeTool === 'frame') {
      const n = { id: nextId.current++, type: 'frame', x: pt.x, y: pt.y, width: 400, height: 300, title: 'Frame' };
      setBoardObjects(prev => [...prev, n]);
      setActiveTool('select');
    }
  };

  // --- Access error screen ---
  if (accessError) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0a0a0f', color: '#f0f0f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: '600' }}>
            Access Denied
          </h2>
          <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
            {accessError}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              color: 'white', border: 'none', borderRadius: '10px',
              cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              boxShadow: '0 0 20px rgba(56,189,248,0.2)',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg }}>
      <BoardHeader
        boardTitle={boardTitle} setBoardTitle={setBoardTitle}
        saveBoard={saveBoard} boardId={boardId} saveStatus={saveStatus}
        onlineUsers={onlineUsers} user={user}
        onClear={onClear}
        onShare={onShare}
        navigate={navigate} theme={theme}
      />

      {showShareModal && <ShareModal boardId={boardId} isPublic={isBoardPublic} onClose={() => setShowShareModal(false)} />}

      <AIChat
        showAIChat={showAIChat} setShowAIChat={setShowAIChat}
        aiInput={aiInput} setAiInput={setAiInput}
        aiResponse={aiResponse} isProcessing={isProcessing}
        processAICommand={processAICommand}
        isWizardHovered={isWizardHovered} setIsWizardHovered={setIsWizardHovered}
      />

      <div style={{ flex: 1, position: 'relative' }}>
        <Toolbar
          activeTool={activeTool} setActiveTool={handleToolChange}
          showStickyMenu={showStickyMenu} setShowStickyMenu={setShowStickyMenu}
          showShapeMenu={showShapeMenu} setShowShapeMenu={setShowShapeMenu}
          stickyColor={stickyColor} setStickyColor={setStickyColor}
          shapeType={shapeType} setShapeType={setShapeType}
          selectedId={selectedId} selectedIds={selectedIds}
          handleDelete={handleDelete}
          bringToFront={bringToFront} bringForward={bringForward}
          sendBackward={sendBackward} sendToBack={sendToBack}
          handleUndo={handleUndo} handleRedo={handleRedo}
          historyIndex={historyIndex} historyLength={history.length}
          darkMode={darkMode} theme={theme}
        />

        {(activeTool === 'pen' || activeTool === 'arrow' || activeTool === 'line') && (
          <DrawingPanel drawColor={drawColor} setDrawColor={setDrawColor} strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} darkMode={darkMode} theme={theme} />
        )}

        <ZoomControls
          zoom={zoom} setZoom={setZoom} zoomIn={zoomIn} zoomOut={zoomOut} fitToScreen={fitToScreen}
          showZoomMenu={showZoomMenu} setShowZoomMenu={setShowZoomMenu}
          darkMode={darkMode} theme={theme}
        />

        {/* Main Canvas */}
        <div
          ref={canvasRefCallback}
          onMouseDown={handleMouseDown}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : isRotating ? 'grabbing' : draggedId ? 'grabbing' : activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : activeTool === 'eraser' ? 'none' : 'crosshair',
            background: `radial-gradient(circle, ${darkMode ? 'rgba(200,220,255,0.25)' : 'rgba(0,0,0,0.15)'} 1px, ${theme.canvasBg} 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${viewportOffset.x}px ${viewportOffset.y}px`,
          }}
        >
          <div style={{
            transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0', position: 'relative', width: '5000px', height: '5000px',
          }}>
            {visibleObjects.map(obj => (
              <BoardObject
                key={obj.id}
                obj={obj}
                isSelected={obj.id === selectedId || selectedSet.has(obj.id)}
                isEditing={obj.id === editingId}
                editingText={editingText}
                setEditingId={setEditingId}
                setEditingText={setEditingText}
                handleMouseDown={handleMouseDown}
                setBoardObjects={setBoardObjects}
                setIsResizing={setIsResizing}
                setResizeHandle={setResizeHandle}
                setIsRotating={setIsRotating}
                isMultiSelected={selectedIds.length > 1}
                theme={theme}
              />
            ))}

            {selectionBox && (
              <div style={{
                position: 'absolute',
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY),
                border: '2px solid #2196F3', background: 'rgba(33,150,243,0.08)',
                borderRadius: '2px', pointerEvents: 'none',
              }} />
            )}

            {isDrawing && currentPath.length > 1 && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '5000px', height: '5000px', pointerEvents: 'none', overflow: 'visible' }}>
                <path
                  d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                  stroke={drawColor} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7}
                />
              </svg>
            )}

            {Object.entries(cursors).map(([userId, pos], idx) => {
              const userInfo = onlineUsers.find(u => u.user_id === userId);
              const displayName = userInfo?.display_name || userInfo?.email?.split('@')[0] || 'User';
              return (
                <div key={userId} style={{
                  position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
                  pointerEvents: 'none', zIndex: 10000, transform: 'translate(-2px, -2px)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                    <path d="M5.65376 12.3673L11.6126 5.48095C12.0744 4.93352 12.9426 5.26073 12.9426 5.98534L12.9426 10.1721C12.9426 10.5183 13.2221 10.7977 13.5683 10.7977L18.3479 10.7977C18.9989 10.7977 19.3072 11.6137 18.7889 12.0623L12.8301 18.9486C12.3683 19.496 11.5001 19.1688 11.5001 18.4442L11.5001 14.2575C11.5001 13.9113 11.2206 13.6318 10.8744 13.6318L6.09482 13.6318C5.44382 13.6318 5.13553 12.8158 5.65376 12.3673Z"
                      fill={`hsl(${(idx * 137.5) % 360}, 70%, 60%)`} />
                  </svg>
                  <div style={{
                    marginTop: '4px', marginLeft: '12px', padding: '4px 8px',
                    background: `hsl(${(idx * 137.5) % 360}, 70%, 60%)`,
                    color: 'white', borderRadius: '4px', fontSize: '12px',
                    fontWeight: '600', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}>
                    {displayName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {activeTool === 'eraser' && eraserPos && (
        <div style={{
          position: 'fixed', left: eraserPos.x, top: eraserPos.y,
          width: '24px', height: '24px', borderRadius: '50%',
          border: `2px solid ${theme.textSecondary}`,
          background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
          transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 99998,
          transition: 'border-color 0.1s',
          ...(isErasing ? { borderColor: '#f44336', background: 'rgba(244,67,54,0.15)' } : {}),
        }} />
      )}

      {showConfetti && <Confetti />}
    </div>
  );
};

export default AIBoard;
