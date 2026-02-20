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
import { pointToSegmentDist, getObjBounds, boxesIntersect, getAnchorPoint, getAnchorNames, getNearestAnchor, getConnectorEndpoints, computeCurvedConnectorPath } from './lib/geometry';
import { openaiToolSchemas } from './lib/boardTools';
import { getUserAvatar } from './lib/utils';

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
  const dragStart = useRef({ screenX: 0, screenY: 0, objX: 0, objY: 0 });
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
  const [lineEnd, setLineEnd] = useState(null);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserPos, setEraserPos] = useState(null);
  const [stickyColor, setStickyColor] = useState('yellow');
  const [shapeType, setShapeType] = useState('rectangle');
  const [showStickyMenu, setShowStickyMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);

  // --- Connector state ---
  const [connectingFrom, setConnectingFrom] = useState(null); // { objId }
  const [connectorPreview, setConnectorPreview] = useState(null); // { x1,y1,x2,y2 }
  const [hoveredObjId, setHoveredObjId] = useState(null);

  // --- Edit state ---
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
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

  // --- History (per-user action-based) ---
  const [actionHistory, setActionHistory] = useState([]);
  const prevBoardRef = useRef([]);
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
  const innerDivRef = useRef(null);

  // --- Theme ---
  const theme = darkTheme;

  // Fast object lookup by id (for connector endpoint computation)
  const objMap = useMemo(() => {
    const m = {};
    for (const o of boardObjects) m[o.id] = o;
    return m;
  }, [boardObjects]);

  // Viewport culling: only render objects visible in viewport + buffer
  // Connectors are always kept (their bounds depend on referenced objects)
  const { visible: visibleObjects, selectedSet } = useMemo(() => {
    const vLeft = -viewportOffset.x / zoom - CULL_MARGIN;
    const vTop = -viewportOffset.y / zoom - CULL_MARGIN;
    const vRight = (window.innerWidth - viewportOffset.x) / zoom + CULL_MARGIN;
    const vBottom = (window.innerHeight - viewportOffset.y) / zoom + CULL_MARGIN;
    const viewport = { x: vLeft, y: vTop, w: vRight - vLeft, h: vBottom - vTop };

    const visible = boardObjects.filter(obj =>
      obj.type === 'connector' || boxesIntersect(getObjBounds(obj), viewport)
    );
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

  // --- Undo/redo history (per-user, action-based) ---
  useEffect(() => {
    if (!boardLoaded) return;
    if (isUndoRedo.current) { isUndoRedo.current = false; prevBoardRef.current = boardObjects; return; }

    const prev = prevBoardRef.current;
    const prevMap = {};
    for (const o of prev) prevMap[o.id] = o;
    const currMap = {};
    for (const o of boardObjects) currMap[o.id] = o;

    const changes = [];
    for (const o of boardObjects) {
      if (!prevMap[o.id]) {
        changes.push({ id: o.id, before: null, after: { ...o } });
      } else if (prevMap[o.id] !== o) {
        changes.push({ id: o.id, before: { ...prevMap[o.id] }, after: { ...o } });
      }
    }
    for (const o of prev) {
      if (!currMap[o.id]) {
        changes.push({ id: o.id, before: { ...o }, after: null });
      }
    }

    if (changes.length > 0) {
      const userId = user?.email || 'anonymous';
      const action = { userId, timestamp: Date.now(), changes, undone: false };
      setActionHistory(prevH => {
        const cleaned = prevH.filter(a => !(a.userId === userId && a.undone));
        const trimmed = cleaned.length >= HISTORY_MAX_DEPTH ? cleaned.slice(cleaned.length - HISTORY_MAX_DEPTH + 1) : cleaned;
        return [...trimmed, action];
      });
    }

    prevBoardRef.current = boardObjects;
  }, [boardObjects]);

  const canUndo = actionHistory.some(a => a.userId === (user?.email || 'anonymous') && !a.undone);
  const canRedo = actionHistory.some(a => a.userId === (user?.email || 'anonymous') && a.undone);

  const handleUndo = useCallback(() => {
    const userId = user?.email || 'anonymous';
    setActionHistory(prevHistory => {
      let targetIdx = -1;
      for (let i = prevHistory.length - 1; i >= 0; i--) {
        if (prevHistory[i].userId === userId && !prevHistory[i].undone) {
          targetIdx = i;
          break;
        }
      }
      if (targetIdx === -1) return prevHistory;

      const action = prevHistory[targetIdx];
      isUndoRedo.current = true;
      setBoardObjects(currentBoard => {
        let result = [...currentBoard];
        for (const change of action.changes) {
          if (change.before === null && change.after !== null) {
            result = result.filter(o => o.id !== change.id);
          } else if (change.before !== null && change.after === null) {
            result = [...result, change.before];
          } else {
            result = result.map(o => o.id === change.id ? change.before : o);
          }
        }
        return result;
      });
      setSelectedId(null);

      const updated = [...prevHistory];
      updated[targetIdx] = { ...updated[targetIdx], undone: true };
      return updated;
    });
  }, [user]);

  const handleRedo = useCallback(() => {
    const userId = user?.email || 'anonymous';
    setActionHistory(prevHistory => {
      let targetIdx = -1;
      for (let i = 0; i < prevHistory.length; i++) {
        if (prevHistory[i].userId === userId && prevHistory[i].undone) {
          targetIdx = i;
          break;
        }
      }
      if (targetIdx === -1) return prevHistory;

      const action = prevHistory[targetIdx];
      isUndoRedo.current = true;
      setBoardObjects(currentBoard => {
        let result = [...currentBoard];
        for (const change of action.changes) {
          if (change.before === null && change.after !== null) {
            result = [...result, change.after];
          } else if (change.before !== null && change.after === null) {
            result = result.filter(o => o.id !== change.id);
          } else {
            result = result.map(o => o.id === change.id ? change.after : o);
          }
        }
        return result;
      });
      setSelectedId(null);

      const updated = [...prevHistory];
      updated[targetIdx] = { ...updated[targetIdx], undone: false };
      return updated;
    });
  }, [user]);

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
          prevBoardRef.current = objs;
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
  const executeToolCall = useCallback(async (toolName, toolInput) => {
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
      case "findOpenSpace": {
        const pad = 40;
        const needW = toolInput.width;
        const needH = toolInput.height;

        // Start from the center of the user's current viewport
        const vpCenterX = (-viewportOffset.x + window.innerWidth / 2) / zoom;
        const vpCenterY = (-viewportOffset.y + window.innerHeight / 2) / zoom;

        if (boardObjects.length === 0) {
          return { x: Math.round(vpCenterX - needW / 2), y: Math.round(vpCenterY - needH / 2) };
        }

        // Check if a candidate rectangle overlaps any existing object
        const overlaps = (cx, cy) => {
          for (const obj of boardObjects) {
            const b = getObjBounds(obj);
            if (cx < b.x + b.w + pad && cx + needW + pad > b.x &&
                cy < b.y + b.h + pad && cy + needH + pad > b.y) {
              return true;
            }
          }
          return false;
        };

        // Try placing near the viewport center first, then search outward
        const startX = Math.round(vpCenterX - needW / 2);
        const startY = Math.round(vpCenterY - needH / 2);

        // Try viewport center
        if (!overlaps(startX, startY)) {
          return { x: startX, y: startY };
        }

        // Search nearby: right, below, left, above — expanding outward
        const step = 200;
        for (let dist = step; dist <= 2000; dist += step) {
          // Right of viewport center
          if (!overlaps(startX + dist, startY)) return { x: startX + dist, y: startY };
          // Below
          if (!overlaps(startX, startY + dist)) return { x: startX, y: startY + dist };
          // Left
          if (!overlaps(startX - dist, startY)) return { x: startX - dist, y: startY };
          // Above
          if (!overlaps(startX, startY - dist)) return { x: startX, y: startY - dist };
        }

        // Fallback: just to the right of everything
        let maxRight = -Infinity;
        let minObjY = Infinity;
        for (const obj of boardObjects) {
          const b = getObjBounds(obj);
          maxRight = Math.max(maxRight, b.x + b.w);
          minObjY = Math.min(minObjY, b.y);
        }
        return { x: Math.round(maxRight + pad), y: Math.round(minObjY) };
      }
      case "deleteObjects": {
        const ids = new Set(toolInput.objectIds);
        setBoardObjects(prev => prev.filter(obj => {
          if (ids.has(obj.id)) return false;
          if (obj.type === 'connector' && (ids.has(obj.fromId) || ids.has(obj.toId))) return false;
          return true;
        }));
        return { success: true, deletedCount: toolInput.objectIds.length };
      }
      case "alignObjects": {
        const targets = boardObjects.filter(o => toolInput.objectIds.includes(o.id));
        if (targets.length < 2) return { success: false, error: 'Need at least 2 objects to align' };
        const al = toolInput.alignment;
        let anchor;
        if (al === 'left')   anchor = Math.min(...targets.map(o => o.x));
        if (al === 'right')  anchor = Math.max(...targets.map(o => o.x + (o.width || 200)));
        if (al === 'center') anchor = (Math.min(...targets.map(o => o.x)) + Math.max(...targets.map(o => o.x + (o.width || 200)))) / 2;
        if (al === 'top')    anchor = Math.min(...targets.map(o => o.y));
        if (al === 'bottom') anchor = Math.max(...targets.map(o => o.y + (o.height || 200)));
        if (al === 'middle') anchor = (Math.min(...targets.map(o => o.y)) + Math.max(...targets.map(o => o.y + (o.height || 200)))) / 2;
        setBoardObjects(prev => prev.map(obj => {
          if (!toolInput.objectIds.includes(obj.id)) return obj;
          const w = obj.width || 200, h = obj.height || 200;
          if (al === 'left')   return { ...obj, x: anchor };
          if (al === 'right')  return { ...obj, x: anchor - w };
          if (al === 'center') return { ...obj, x: anchor - w / 2 };
          if (al === 'top')    return { ...obj, y: anchor };
          if (al === 'bottom') return { ...obj, y: anchor - h };
          if (al === 'middle') return { ...obj, y: anchor - h / 2 };
          return obj;
        }));
        return { success: true, alignedCount: targets.length };
      }
      case "distributeObjects": {
        const targets = boardObjects.filter(o => toolInput.objectIds.includes(o.id));
        if (targets.length < 3) return { success: false, error: 'Need at least 3 objects to distribute' };
        if (toolInput.direction === 'horizontal') {
          const sorted = [...targets].sort((a, b) => a.x - b.x);
          const first = sorted[0], last = sorted[sorted.length - 1];
          const totalSpan = (last.x + (last.width || 200)) - first.x;
          const totalObjWidth = sorted.reduce((sum, o) => sum + (o.width || 200), 0);
          const gap = (totalSpan - totalObjWidth) / (sorted.length - 1);
          let curX = first.x;
          const positions = sorted.map(o => { const x = curX; curX += (o.width || 200) + gap; return { id: o.id, x }; });
          setBoardObjects(prev => prev.map(obj => {
            const pos = positions.find(p => p.id === obj.id);
            return pos ? { ...obj, x: Math.round(pos.x) } : obj;
          }));
        } else {
          const sorted = [...targets].sort((a, b) => a.y - b.y);
          const first = sorted[0], last = sorted[sorted.length - 1];
          const totalSpan = (last.y + (last.height || 200)) - first.y;
          const totalObjHeight = sorted.reduce((sum, o) => sum + (o.height || 200), 0);
          const gap = (totalSpan - totalObjHeight) / (sorted.length - 1);
          let curY = first.y;
          const positions = sorted.map(o => { const y = curY; curY += (o.height || 200) + gap; return { id: o.id, y }; });
          setBoardObjects(prev => prev.map(obj => {
            const pos = positions.find(p => p.id === obj.id);
            return pos ? { ...obj, y: Math.round(pos.y) } : obj;
          }));
        }
        return { success: true, distributedCount: targets.length };
      }
      case "webSearch": {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`${API_URL}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ query: toolInput.query }),
        });
        const data = await resp.json();
        if (!resp.ok) return { error: data.error || 'Search failed' };
        const summaries = (data.results || []).slice(0, 5)
          .map((r, i) => `${i + 1}. ${r.title}: ${(r.content || r.url || '').slice(0, 200)}`)
          .join('\n');
        return { results: summaries || 'No results found' };
      }
      case "generateContent": {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`${API_URL}/api/generate-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ topic: toolInput.topic, type: toolInput.type, count: toolInput.count }),
        });
        const data = await resp.json();
        if (!resp.ok) return { error: data.error || 'Content generation failed' };
        return { items: data.items };
      }
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }, [boardObjects]);

  // --- AI command processing ---
  // Pre-compute the next open space on the frontend (saves a full round-trip for every template)
  const nextOpenSpace = (() => {
    const pad = 40;
    const needW = 2000, needH = 2000; // generous size — fits any template
    const vpCenterX = (-viewportOffset.x + window.innerWidth / 2) / zoom;
    const vpCenterY = (-viewportOffset.y + window.innerHeight / 2) / zoom;
    if (boardObjects.length === 0) {
      return { x: Math.round(vpCenterX - needW / 2), y: Math.round(vpCenterY - needH / 2) };
    }
    const overlaps = (cx, cy) => boardObjects.some(obj => {
      const b = getObjBounds(obj);
      return cx < b.x + b.w + pad && cx + needW + pad > b.x &&
             cy < b.y + b.h + pad && cy + needH + pad > b.y;
    });
    const sx = Math.round(vpCenterX - needW / 2);
    const sy = Math.round(vpCenterY - needH / 2);
    if (!overlaps(sx, sy)) return { x: sx, y: sy };
    for (let dist = 200; dist <= 4000; dist += 200) {
      if (!overlaps(sx + dist, sy)) return { x: sx + dist, y: sy };
      if (!overlaps(sx, sy + dist)) return { x: sx, y: sy + dist };
      if (!overlaps(sx - dist, sy)) return { x: sx - dist, y: sy };
      if (!overlaps(sx, sy - dist)) return { x: sx, y: sy - dist };
    }
    let maxRight = -Infinity, minObjY = Infinity;
    for (const obj of boardObjects) { const b = getObjBounds(obj); maxRight = Math.max(maxRight, b.x + b.w); minObjY = Math.min(minObjY, b.y); }
    return { x: Math.round(maxRight + pad), y: Math.round(minObjY) };
  })();

  // Pre-compute exact absolute coordinates for every template object (no AI arithmetic needed)
  const T = (() => {
    const sx = nextOpenSpace.x, sy = nextOpenSpace.y;
    // Sticky centering: frame 400w → (400-200)/2=100 left margin; frame 350h, ~35px title → (350-35-200)/2+35=92 top margin
    const sc = (fx, fy) => ({ x: fx + 100, y: fy + 92 }); // center a 200x200 sticky inside a 400x350 frame

    // SWOT (2×2 grid of 400×350 frames, 20px gap)
    const swF = [
      { x: sx,       y: sy,       w: 400, h: 350, title: 'Strengths' },
      { x: sx + 420, y: sy,       w: 400, h: 350, title: 'Weaknesses' },
      { x: sx,       y: sy + 370, w: 400, h: 350, title: 'Opportunities' },
      { x: sx + 420, y: sy + 370, w: 400, h: 350, title: 'Threats' },
    ];
    const swS = [
      { ...sc(sx, sy),             color: 'green'  },
      { ...sc(sx + 420, sy),       color: 'pink'   },
      { ...sc(sx, sy + 370),       color: 'blue'   },
      { ...sc(sx + 420, sy + 370), color: 'orange' },
    ];

    // Kanban (4 frames of 300×500, 20px gap; stickies stacked, 50px left margin in 300w frame)
    const kbFX = [sx, sx + 320, sx + 640, sx + 960];
    const kbFrames = [
      { x: kbFX[0], y: sy, w: 300, h: 500, title: 'To Do' },
      { x: kbFX[1], y: sy, w: 300, h: 500, title: 'In Progress' },
      { x: kbFX[2], y: sy, w: 300, h: 500, title: 'Review' },
      { x: kbFX[3], y: sy, w: 300, h: 500, title: 'Done' },
    ];
    // 3 stickies per column: top=sy+45, mid=sy+255, bot=sy+395 (height 95 for last)
    const kbStickies = kbFX.map(fx => [
      { x: fx + 50, y: sy + 45,  color: 'yellow' },
      { x: fx + 50, y: sy + 255, color: 'yellow' },
    ]);

    // Retro (3 frames of 350×450)
    const retFX = [sx, sx + 370, sx + 740];
    const retFrames = [
      { x: retFX[0], y: sy, w: 350, h: 450, title: 'What Went Well' },
      { x: retFX[1], y: sy, w: 350, h: 450, title: "What Didn't Go Well" },
      { x: retFX[2], y: sy, w: 350, h: 450, title: 'Action Items' },
    ];
    const retColors = ['green', 'pink', 'blue'];
    // center 200x200 sticky in 350w frame: (350-200)/2=75 left margin
    // frame h=450: first at +20, second at +230 → bottom at +430 (fits with 20px to spare)
    const retStickies = retFX.map((fx, i) => [
      { x: fx + 75, y: sy + 20,  color: retColors[i] },
      { x: fx + 75, y: sy + 230, color: retColors[i] },
    ]);

    // Pro/Con (2 frames of 340×420)
    const pcFrames = [
      { x: sx,       y: sy, w: 340, h: 420, title: 'Pros' },
      { x: sx + 360, y: sy, w: 340, h: 420, title: 'Cons' },
    ];
    // center in 340w: (340-200)/2=70; center in 420h with 35px title: (420-35-200)/2+35=127
    const pcStickies = [
      { x: sx + 70,       y: sy + 127, color: 'green' },
      { x: sx + 360 + 70, y: sy + 127, color: 'pink'  },
    ];

    return { swF, swS, kbFrames, kbStickies, retFrames, retStickies, pcFrames, pcStickies };
  })();

  // Pre-inject board state so the AI doesn't need to call getBoardState (saves a round-trip)
  const boardStateSummary = (() => {
    if (!boardObjects || boardObjects.length === 0) return 'The board is currently empty.';
    // Cap at 50 objects to avoid bloating the prompt on large boards
    const objs = boardObjects.slice(0, 50);
    const summary = objs.map(o => {
      const parts = [`id:${o.id}`, `type:${o.type}`];
      if (o.text) parts.push(`text:"${o.text.slice(0, 40)}"`);
      if (o.title) parts.push(`title:"${o.title.slice(0, 40)}"`);
      parts.push(`pos:(${Math.round(o.x)},${Math.round(o.y)})`);
      if (o.width) parts.push(`size:${Math.round(o.width)}x${Math.round(o.height)}`);
      if (o.color) parts.push(`color:${o.color}`);
      return `[${parts.join(', ')}]`;
    }).join('\n');
    const extra = boardObjects.length > 50 ? `\n...and ${boardObjects.length - 50} more objects (call getBoardState for full list)` : '';
    return `${objs.length} object(s) on the board:\n${summary}${extra}`;
  })();

  const systemMessage = {
    role: "system",
    content: `You are Mission Control — the AI operator for a visual collaboration board. You speak in a calm, confident, space-mission tone: think NASA flight controllers with a dry wit. Use short, clipped phrases like "Copy that", "Roger", "Initiating sequence", "All systems go", "Confirmed", "Board updated — standing by." Avoid filler words. After completing a task, sign off with a single punchy mission-control line. Never say "I" — speak as Mission Control. No emojis in your text responses. If someone asks something off-topic or silly (jokes, trivia, small talk), play along briefly in character — a dry one-liner is fine — then offer to get back to the mission. You have a personality. Use the provided tools to create sticky notes, shapes, text, frames, connectors, and organize elements on the board.

Current board state (auto-provided — do NOT call getBoardState unless you need a fresh snapshot after mutations):
${boardStateSummary}

Currently selected objects (what the user means by "these", "them", "the selected ones", "this"):
${selectedIds.length > 0 ? `IDs: [${selectedIds.join(', ')}] — always use these IDs when the user refers to selected or highlighted objects.` : 'Nothing selected — if the user says "these" or "them", infer from context (e.g. all sticky notes on the board) or ask which objects they mean.'}

Next available open area (pre-computed, no need to call findOpenSpace): x=${nextOpenSpace.x}, y=${nextOpenSpace.y}
Use (sx=${nextOpenSpace.x}, sy=${nextOpenSpace.y}) as your base for templates and multi-object placement. Only call findOpenSpace if you need a fresh position AFTER making board mutations in this session.

Rules:
- For CREATING new objects: use the pre-computed open area above as your starting position. Do NOT call findOpenSpace — it is already done for you.
- For MODIFYING existing objects (move, resize, recolor, delete, connect): use the board state above to find object IDs. Only call getBoardState if the above state seems stale or incomplete.
- Do NOT call getBoardState as a first step — the board state is already provided above.
- BATCH all tool calls: when creating a template or multiple objects, issue ALL tool calls (frames, stickies, connectors) in ONE response — do not split them across multiple replies.
- Be concise: after completing a task, reply with ONE short sentence only (e.g. "Done — SWOT analysis created."). Do not explain what you did, list the objects, or mention zoom.
- Prefer modifying existing objects (move, resize, recolor) over deleting and recreating them.
- Never move objects the user didn't ask you to move.
- Understand spatial relationships: an object is "inside" a frame if its x,y position falls within the frame's x,y,width,height bounds.
- When a command is ambiguous, ask the user to clarify before acting.
- When resizing a frame to fit contents: find objects inside/near the frame, calculate their bounding box (min x, min y, max x+width, max y+height), add ~20px padding, then use resizeObject and optionally moveObject on the FRAME only — never move the contents.
- When arranging in grids, account for object sizes (sticky notes are 200x200, shapes vary).
- Use createConnector to draw arrows or lines between related objects (e.g. journey map stages, flow diagrams).
- Use webSearch when the user wants current/real information (news, facts, research). After searching, create sticky notes with key findings.
- Use generateContent to pre-fill templates with relevant ideas, risks, action items, etc. — then place results as sticky notes. Pair it with createStickyNote in one batched response.
- Use alignObjects to line up objects along a common edge (e.g. "align left", "center horizontally").
- Use distributeObjects to evenly space 3+ objects (e.g. "distribute horizontally").
- CRITICAL: When the user says "arrange these", "space these", "align these", "move these", or any command referencing "these"/"them" — ALWAYS use the selected object IDs listed above. Do NOT create new objects.
- Be creative and helpful.

Template Blueprints — when the user asks for one of these, follow the layout precisely using the EXACT pixel values given. No approximations.
Use sx=${nextOpenSpace.x}, sy=${nextOpenSpace.y} as your base. All positions below are offsets from (sx, sy). Do NOT call findOpenSpace — the base is already provided above.

SWOT Analysis — use these EXACT coordinates, copy them verbatim:
  Frame "Strengths"     x=${T.swF[0].x} y=${T.swF[0].y} width=400 height=350
  Frame "Weaknesses"    x=${T.swF[1].x} y=${T.swF[1].y} width=400 height=350
  Frame "Opportunities" x=${T.swF[2].x} y=${T.swF[2].y} width=400 height=350
  Frame "Threats"       x=${T.swF[3].x} y=${T.swF[3].y} width=400 height=350
  Sticky green  "Placeholder" x=${T.swS[0].x} y=${T.swS[0].y}
  Sticky pink   "Placeholder" x=${T.swS[1].x} y=${T.swS[1].y}
  Sticky blue   "Placeholder" x=${T.swS[2].x} y=${T.swS[2].y}
  Sticky orange "Placeholder" x=${T.swS[3].x} y=${T.swS[3].y}

User Journey Map — use these EXACT coordinates:
  Frame "Awareness"     x=${nextOpenSpace.x}       y=${nextOpenSpace.y} width=300 height=450
  Frame "Consideration" x=${nextOpenSpace.x + 330}  y=${nextOpenSpace.y} width=300 height=450
  Frame "Purchase"      x=${nextOpenSpace.x + 660}  y=${nextOpenSpace.y} width=300 height=450
  Frame "Onboarding"    x=${nextOpenSpace.x + 990}  y=${nextOpenSpace.y} width=300 height=450
  Frame "Retention"     x=${nextOpenSpace.x + 1320} y=${nextOpenSpace.y} width=300 height=450
Inside each frame, 3 stickies stacked (50px left margin, first at frame_y+45, second at frame_y+255):
  blue "User action", yellow "Touchpoint", pink "Pain point"
Connect frames in sequence with createConnector style "arrow".

Retrospective Board — use these EXACT coordinates:
  Frame "What Went Well"      x=${T.retFrames[0].x} y=${T.retFrames[0].y} width=350 height=450
  Frame "What Didn't Go Well" x=${T.retFrames[1].x} y=${T.retFrames[1].y} width=350 height=450
  Frame "Action Items"        x=${T.retFrames[2].x} y=${T.retFrames[2].y} width=350 height=450
  Sticky green  "Placeholder" x=${T.retStickies[0][0].x} y=${T.retStickies[0][0].y}
  Sticky green  "Placeholder" x=${T.retStickies[0][1].x} y=${T.retStickies[0][1].y}
  Sticky pink   "Placeholder" x=${T.retStickies[1][0].x} y=${T.retStickies[1][0].y}
  Sticky pink   "Placeholder" x=${T.retStickies[1][1].x} y=${T.retStickies[1][1].y}
  Sticky blue   "Placeholder" x=${T.retStickies[2][0].x} y=${T.retStickies[2][0].y}
  Sticky blue   "Placeholder" x=${T.retStickies[2][1].x} y=${T.retStickies[2][1].y}

Kanban Board — use these EXACT coordinates:
  Frame "To Do"       x=${T.kbFrames[0].x} y=${T.kbFrames[0].y} width=300 height=500
  Frame "In Progress" x=${T.kbFrames[1].x} y=${T.kbFrames[1].y} width=300 height=500
  Frame "Review"      x=${T.kbFrames[2].x} y=${T.kbFrames[2].y} width=300 height=500
  Frame "Done"        x=${T.kbFrames[3].x} y=${T.kbFrames[3].y} width=300 height=500
  Sticky yellow "Task 1" x=${T.kbStickies[0][0].x} y=${T.kbStickies[0][0].y}
  Sticky yellow "Task 2" x=${T.kbStickies[0][1].x} y=${T.kbStickies[0][1].y}

Pro/Con Grid — use these EXACT coordinates:
  Frame "Pros" x=${T.pcFrames[0].x} y=${T.pcFrames[0].y} width=340 height=420
  Frame "Cons" x=${T.pcFrames[1].x} y=${T.pcFrames[1].y} width=340 height=420
  Sticky green "Add a pro" x=${T.pcStickies[0].x} y=${T.pcStickies[0].y}
  Sticky pink  "Add a con" x=${T.pcStickies[1].x} y=${T.pcStickies[1].y}

Templates are placed at the viewport center, so they are already visible. Do NOT call zoomToFit for templates.`,
  };

  const processAICommand = async () => {
    if (!aiInput.trim() || isProcessing) return;
    setIsProcessing(true);
    setAiResponse('');
    const userMessage = { role: "user", content: aiInput };
    setAiInput('');
    const newHistory = [...conversationHistory, userMessage];
    setConversationHistory(newHistory);
    // Track bounds of newly created objects directly from tool inputs (no state read needed)
    const createdBounds = [];
    const CREATION_TOOLS_AI = new Set(['createStickyNote', 'createShape', 'createFrame', 'createText']);

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
            tools: openaiToolSchemas,
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
            const toolName = toolCall.function.name;
            const toolInput = JSON.parse(toolCall.function.arguments);
            const result = await executeToolCall(toolName, toolInput);

            // Collect bounds synchronously from tool inputs — no state read needed
            if (CREATION_TOOLS_AI.has(toolName) && result.success) {
              createdBounds.push({
                x: toolInput.x ?? 0,
                y: toolInput.y ?? 0,
                w: toolInput.width || 200,
                h: toolInput.height || 200,
              });
            }

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

      // Auto-zoom with smooth CSS transition — purely visual, doesn't affect drag math
      if (createdBounds.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const b of createdBounds) {
          minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
        }
        const pad = 80;
        const newZoom = Math.min(Math.max(Math.min(
          window.innerWidth / (maxX - minX + pad * 2),
          window.innerHeight / (maxY - minY + pad * 2)
        ), ZOOM_MIN), ZOOM_MAX);
        if (innerDivRef.current) {
          innerDivRef.current.style.transition = 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)';
          setTimeout(() => { if (innerDivRef.current) innerDivRef.current.style.transition = ''; }, 1000);
        }
        setZoom(newZoom);
        setViewportOffset({
          x: window.innerWidth / 2 - (minX + (maxX - minX) / 2) * newZoom,
          y: window.innerHeight / 2 - (minY + (maxY - minY) / 2) * newZoom,
        });
      }
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

  // --- Connector: start connection from an anchor dot ---
  const handleAnchorMouseDown = (e, objId, anchor) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom({ objId, anchor });
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
          dragStart.current = {
            screenX: e.clientX, screenY: e.clientY,
            objX: obj.x ?? obj.x1 ?? (obj.points?.[0]?.x || 0),
            objY: obj.y ?? obj.y1 ?? (obj.points?.[0]?.y || 0),
          };
        }
        e.stopPropagation();
        return;
      }
      setDraggedId(objId);
      setSelectedId(objId);
      setSelectedIds([objId]);
      const obj = boardObjects.find(o => o.id === objId);
      if (obj) {
        dragStart.current = {
          screenX: e.clientX, screenY: e.clientY,
          objX: obj.x ?? obj.x1 ?? (obj.points?.[0]?.x || 0),
          objY: obj.y ?? obj.y1 ?? (obj.points?.[0]?.y || 0),
        };
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
      if (pt && (activeTool === 'pen' || activeTool === 'eraser' || activeTool === 'arrow' || activeTool === 'line' || activeTool === 'shape' || activeTool === 'frame')) {
        if (activeTool === 'pen') { setIsDrawing(true); setCurrentPath([pt]); }
        else if (activeTool === 'eraser') { setIsErasing(true); eraseAtPoint(pt.x, pt.y); }
        else if (activeTool === 'arrow' || activeTool === 'line' || activeTool === 'shape' || activeTool === 'frame') setLineStart(pt);
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

      // Connector drag: runs whenever actively dragging from an anchor (any tool)
      if (connectingFrom && pt) {
        const CONNECTABLE = ['stickyNote', 'shape', 'text', 'frame', 'comment'];
        const underCursor = boardObjects.find(o => {
          if (!CONNECTABLE.includes(o.type)) return false;
          if (o.id === connectingFrom.objId) return false;
          const b = getObjBounds(o);
          return pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h;
        });
        setHoveredObjId(underCursor?.id ?? null);

        const fromObj = boardObjects.find(o => o.id === connectingFrom.objId);
        if (fromObj) {
          const startPt = getAnchorPoint(fromObj, connectingFrom.anchor);
          let endX = pt.x, endY = pt.y;
          if (underCursor) {
            const tAnchor = getNearestAnchor(underCursor, pt.x, pt.y);
            const tPt = getAnchorPoint(underCursor, tAnchor);
            endX = tPt.x; endY = tPt.y;
          }
          setConnectorPreview({ x1: startPt.x, y1: startPt.y, x2: endX, y2: endY });
        }
        return;
      }
      // Connector tool hover detection (no active drag)
      if (activeTool === 'connector' && pt) {
        const CONNECTABLE = ['stickyNote', 'shape', 'text', 'frame', 'comment'];
        const underCursor = boardObjects.find(o => {
          if (!CONNECTABLE.includes(o.type)) return false;
          const b = getObjBounds(o);
          return pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h;
        });
        setHoveredObjId(underCursor?.id ?? null);
        return;
      }

      if (isDrawing && activeTool === 'pen' && pt) { setCurrentPath(prev => [...prev, pt]); return; }
      if (isErasing && activeTool === 'eraser' && pt) { eraseAtPoint(pt.x, pt.y); return; }
      if (lineStart && (activeTool === 'arrow' || activeTool === 'line' || activeTool === 'shape' || activeTool === 'frame') && pt) { setLineEnd(pt); return; }

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
          const handle = resizeHandle || 'se';
          let newX = obj.x, newY = obj.y, newW = obj.width, newH = obj.height;
          if (handle.includes('e')) newW = Math.max(50, mouseX - obj.x);
          if (handle.includes('s')) newH = Math.max(50, mouseY - obj.y);
          if (handle.includes('w')) {
            newW = Math.max(50, (obj.x + obj.width) - mouseX);
            newX = Math.min(mouseX, obj.x + obj.width - 50);
          }
          if (handle.includes('n')) {
            newH = Math.max(50, (obj.y + obj.height) - mouseY);
            newY = Math.min(mouseY, obj.y + obj.height - 50);
          }
          return { ...obj, x: newX, y: newY, width: newW, height: newH };
        }));
        return;
      }

      if (selectionBox && activeTool === 'select' && !draggedId && pt) {
        setSelectionBox(prev => prev ? { ...prev, endX: pt.x, endY: pt.y } : null);
        return;
      }

      if (draggedId) {
        // Use screen-space delta so zoom changes between mousedown and RAF don't cause a jump
        const newX = dragStart.current.objX + (clientX - dragStart.current.screenX) / zoom;
        const newY = dragStart.current.objY + (clientY - dragStart.current.screenY) / zoom;
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
    // Cancel any pending RAF to prevent stale closures from re-setting cleared state
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }

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
        setLineStart(null); setLineEnd(null); setActiveTool('select');
      }
    }
    if (lineStart && (activeTool === 'shape' || activeTool === 'frame')) {
      const pt = screenToBoard(e);
      if (pt) {
        const x = Math.min(lineStart.x, pt.x), y = Math.min(lineStart.y, pt.y);
        const w = Math.abs(pt.x - lineStart.x), h = Math.abs(pt.y - lineStart.y);
        if (activeTool === 'shape') {
          const defaultW = shapeType === 'circle' ? 120 : 150;
          const defaultH = shapeType === 'circle' ? 120 : shapeType === 'triangle' ? 130 : 100;
          const n = {
            id: nextId.current++, type: 'shape', shapeType, color: '#81D4FA',
            x: w > 10 ? x : lineStart.x, y: h > 10 ? y : lineStart.y,
            width: w > 10 ? w : defaultW, height: h > 10 ? h : defaultH,
          };
          setBoardObjects(prev => [...prev, n]);
        } else {
          const n = {
            id: nextId.current++, type: 'frame', title: 'Frame',
            x: w > 10 ? x : lineStart.x, y: h > 10 ? y : lineStart.y,
            width: w > 10 ? w : 400, height: h > 10 ? h : 300,
          };
          setBoardObjects(prev => [...prev, n]);
        }
        setLineStart(null); setLineEnd(null); setActiveTool('select');
      }
    }
    if (connectingFrom) {
      const pt = screenToBoard(e);
      if (pt) {
        const CONNECTABLE = ['stickyNote', 'shape', 'text', 'frame', 'comment'];
        const targetObj = boardObjects.find(o => {
          if (o.id === connectingFrom.objId || !CONNECTABLE.includes(o.type)) return false;
          const b = getObjBounds(o);
          return pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h;
        });
        if (targetObj) {
          const toAnchor = getNearestAnchor(targetObj, pt.x, pt.y);
          setBoardObjects(prev => [...prev, {
            id: nextId.current++, type: 'connector',
            fromId: connectingFrom.objId, toId: targetObj.id,
            fromAnchor: connectingFrom.anchor, toAnchor,
            style: 'arrow', color: drawColor, strokeWidth,
          }]);
        }
      }
      setConnectingFrom(null);
      setConnectorPreview(null);
      setHoveredObjId(null);
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

  // --- Delete (also removes connectors attached to deleted objects) ---
  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      const ids = new Set(selectedIds);
      setBoardObjects(prev => prev.filter(obj => {
        if (ids.has(obj.id)) return false;
        if (obj.type === 'connector' && (ids.has(obj.fromId) || ids.has(obj.toId))) return false;
        return true;
      }));
      setSelectedId(null); setSelectedIds([]);
    } else if (selectedId) {
      setBoardObjects(prev => prev.filter(obj => {
        if (obj.id === selectedId) return false;
        if (obj.type === 'connector' && (obj.fromId === selectedId || obj.toId === selectedId)) return false;
        return true;
      }));
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
    if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'pen' || activeTool === 'eraser' || activeTool === 'arrow' || activeTool === 'line' || activeTool === 'shape' || activeTool === 'frame' || isPanning) return;
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
    } else if (activeTool === 'comment') {
      const av = getUserAvatar(user);
      const n = { id: nextId.current++, type: 'comment', x: pt.x, y: pt.y, text: '', author: user?.email || 'Anonymous', avatar_emoji: av.emoji, avatar_color: av.color, timestamp: Date.now() };
      setBoardObjects(prev => [...prev, n]);
      setEditingId(n.id); setEditingText(''); setActiveTool('select');
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
        onClear={onClear} hasBoardObjects={boardObjects.length > 0}
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
        conversationHistory={conversationHistory}
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
          canUndo={canUndo} canRedo={canRedo}
          darkMode={darkMode} theme={theme}
        />

        {(activeTool === 'pen' || activeTool === 'arrow' || activeTool === 'line' || activeTool === 'connector') && (
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
          <div ref={innerDivRef} style={{
            transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0', position: 'relative', width: '5000px', height: '5000px',
          }}>
            {visibleObjects.map(obj => {
              let renderObj = obj;
              if (obj.type === 'connector') {
                const fromObj = objMap[obj.fromId];
                const toObj = objMap[obj.toId];
                if (!fromObj || !toObj) return null;
                const endpoints = getConnectorEndpoints(fromObj, toObj, obj.fromAnchor, obj.toAnchor);
                renderObj = { ...obj, ...endpoints, fromBounds: getObjBounds(fromObj), toBounds: getObjBounds(toObj) };
              }
              return (
              <BoardObject
                key={obj.id}
                obj={renderObj}
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
                user={user}
              />
              );
            })}

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

            {/* Arrow/line tool: live preview while dragging */}
            {lineStart && lineEnd && (activeTool === 'arrow' || activeTool === 'line') && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '5000px', height: '5000px', overflow: 'visible', pointerEvents: 'none', zIndex: 201 }}>
                {activeTool === 'arrow' && (
                  <defs>
                    <marker id="preview-arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                      <polygon points="0 0, 12 6, 0 12" fill={drawColor} opacity={0.7} />
                    </marker>
                  </defs>
                )}
                <line
                  x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y}
                  stroke={drawColor} strokeWidth={strokeWidth} strokeLinecap="round"
                  opacity={0.7}
                  markerEnd={activeTool === 'arrow' ? 'url(#preview-arrowhead)' : undefined}
                />
              </svg>
            )}

            {/* Shape/frame tool: live preview while dragging */}
            {lineStart && lineEnd && (activeTool === 'shape' || activeTool === 'frame') && (() => {
              const px = Math.min(lineStart.x, lineEnd.x), py = Math.min(lineStart.y, lineEnd.y);
              const pw = Math.abs(lineEnd.x - lineStart.x), ph = Math.abs(lineEnd.y - lineStart.y);
              if (pw < 5 && ph < 5) return null;
              if (activeTool === 'frame') {
                return (
                  <div style={{
                    position: 'absolute', left: px, top: py, width: pw, height: ph,
                    border: '2px dashed rgba(148,163,184,0.6)', borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.03)', pointerEvents: 'none', zIndex: 201,
                  }} />
                );
              }
              return (
                <svg style={{ position: 'absolute', left: px, top: py, width: pw, height: ph, overflow: 'visible', pointerEvents: 'none', zIndex: 201 }}>
                  {(() => {
                    const fill = 'rgba(129,212,250,0.15)', stroke = '#81D4FA', sw = 2, op = 0.7;
                    if (shapeType === 'circle')
                      return <ellipse cx={pw/2} cy={ph/2} rx={pw/2-1} ry={ph/2-1} fill={fill} stroke={stroke} strokeWidth={sw} opacity={op} />;
                    if (shapeType === 'triangle')
                      return <polygon points={`${pw/2},1 ${pw-1},${ph-1} 1,${ph-1}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" opacity={op} />;
                    if (shapeType === 'diamond')
                      return <polygon points={`${pw/2},1 ${pw-1},${ph/2} ${pw/2},${ph-1} 1,${ph/2}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" opacity={op} />;
                    if (shapeType === 'hexagon') {
                      const cx = pw/2, cy = ph/2, rx = pw/2-1, ry = ph/2-1;
                      const pts = Array.from({length:6},(_,i)=>{const a=Math.PI/3*i-Math.PI/2;return `${cx+rx*Math.cos(a)},${cy+ry*Math.sin(a)}`;}).join(' ');
                      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" opacity={op} />;
                    }
                    if (shapeType === 'star') {
                      const cx = pw/2, cy = ph/2, outer = Math.min(pw,ph)/2-1, inner = outer*0.4;
                      const pts = Array.from({length:10},(_,i)=>{const a=Math.PI/5*i-Math.PI/2;const r=i%2===0?outer:inner;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(' ');
                      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" opacity={op} />;
                    }
                    return <rect x={1} y={1} width={pw-2} height={ph-2} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} opacity={op} />;
                  })()}
                </svg>
              );
            })()}

            {/* Anchor dots: show on hovered, connecting, and selected connectable objects */}
            {(() => {
              const CONNECTABLE = ['stickyNote', 'shape', 'text', 'frame', 'comment'];
              const anchorIds = new Set();
              if (hoveredObjId) anchorIds.add(hoveredObjId);
              if (connectingFrom) {
                anchorIds.add(connectingFrom.objId);
                // When actively dragging a connector, only show anchors on nearby objects
                if (connectorPreview) {
                  const cursorX = connectorPreview.x2, cursorY = connectorPreview.y2;
                  const PROXIMITY = 30;
                  for (const o of boardObjects) {
                    if (o.id === connectingFrom.objId || !CONNECTABLE.includes(o.type)) continue;
                    const ob = getObjBounds(o);
                    const nearestX = Math.max(ob.x, Math.min(cursorX, ob.x + ob.w));
                    const nearestY = Math.max(ob.y, Math.min(cursorY, ob.y + ob.h));
                    if (Math.hypot(cursorX - nearestX, cursorY - nearestY) < PROXIMITY) anchorIds.add(o.id);
                  }
                }
              }
              // Show anchors on all selected objects (any tool)
              if (selectedId) {
                const so = boardObjects.find(o => o.id === selectedId);
                if (so && CONNECTABLE.includes(so.type)) anchorIds.add(selectedId);
              }
              for (const sid of selectedIds) {
                const so = boardObjects.find(o => o.id === sid);
                if (so && CONNECTABLE.includes(so.type)) anchorIds.add(sid);
              }
              if (anchorIds.size === 0) return null;
              return [...anchorIds].map(id => {
                const o = boardObjects.find(obj => obj.id === id);
                if (!o) return null;
                const anchorKeys = getAnchorNames(o);
                const dots = anchorKeys.map(key => {
                  const pt = getAnchorPoint(o, key);
                  return { key, x: pt.x, y: pt.y };
                });
                return (
                  <svg key={id} style={{ position: 'absolute', top: 0, left: 0, width: '5000px', height: '5000px', overflow: 'visible', pointerEvents: 'none', zIndex: 200 }}>
                    {dots.map(d => (
                      <circle key={d.key} cx={d.x} cy={d.y} r={7}
                        fill="#2196F3" stroke="white" strokeWidth={2.5} opacity={0.95}
                        style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleAnchorMouseDown(e, id, d.key)}
                      />
                    ))}
                  </svg>
                );
              });
            })()}

            {/* Connector tool: live curved preview while dragging */}
            {connectorPreview && (() => {
              const { x1, y1, x2, y2 } = connectorPreview;
              const dx = x2 - x1, dy = y2 - y1;
              const inferredToAnchor = Math.abs(dx) >= Math.abs(dy)
                ? (dx >= 0 ? 'left' : 'right')
                : (dy >= 0 ? 'top' : 'bottom');
              const fromAnchor = connectingFrom?.anchor || (Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'bottom' : 'top'));
              const pathD = computeCurvedConnectorPath(x1, y1, x2, y2, fromAnchor, inferredToAnchor);
              return (
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '5000px', height: '5000px', overflow: 'visible', pointerEvents: 'none', zIndex: 201 }}>
                  <path d={pathD}
                    stroke="#2196F3" strokeWidth={2} fill="none"
                    strokeLinecap="round" strokeDasharray="6 3" opacity={0.8}
                  />
                </svg>
              );
            })()}

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
