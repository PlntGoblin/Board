import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SYNC_DEBOUNCE_MS, CURSOR_THROTTLE_MS } from '../lib/config';
import { getDisplayName } from '../lib/utils';

/**
 * Combined hook for all board real-time features:
 * - Presence (online users)
 * - Cursor broadcasting
 * - Board object sync (delta broadcast)
 * - Database fallback (postgres_changes)
 *
 * Uses a SINGLE Supabase channel to avoid connection issues.
 */
export function useBoardRealtime(boardId, user, boardObjects, setBoardObjects) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState({});

  const channelRef = useRef(null);
  const userRef = useRef(user);

  // Cursor throttle refs
  const lastCursorUpdate = useRef(0);
  const pendingCursorUpdate = useRef(null);

  // Board sync refs
  const ignoreNextUpdate = useRef(false);
  const prevObjectsRef = useRef(boardObjects);
  const boardObjectsRef = useRef(boardObjects);
  const lastBroadcastTime = useRef(0);
  const trailingTimeout = useRef(null);

  // Database fallback: track when we last saved locally to avoid applying our own saves
  const lastLocalSaveTime = useRef(0);

  // Keep refs current
  useEffect(() => { userRef.current = user; }, [user]);
  boardObjectsRef.current = boardObjects;

  // ──────────────────────────────────────────────────
  // Single channel: presence + cursors + board sync + db fallback
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (!boardId || !user?.id) return;

    const channel = supabase.channel(`board:${boardId}`);

    const syncUsers = () => {
      const state = channel.presenceState();
      const users = Object.values(state).flat();
      setOnlineUsers(users);
    };

    channel
      // ── Presence ──
      .on('presence', { event: 'sync' }, syncUsers)
      .on('presence', { event: 'join' }, syncUsers)
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        syncUsers();
        if (leftPresences) {
          setCursors(prev => {
            const next = { ...prev };
            let changed = false;
            for (const p of leftPresences) {
              if (next[p.user_id]) { delete next[p.user_id]; changed = true; }
            }
            return changed ? next : prev;
          });
        }
      })
      // ── Cursor broadcast ──
      .on('broadcast', { event: 'cursor-update' }, (payload) => {
        const { user_id, x, y } = payload.payload;
        if (user_id === user.id) return;
        setCursors(prev => {
          const existing = prev[user_id];
          if (existing && existing.x === x && existing.y === y) return prev;
          return { ...prev, [user_id]: { x, y } };
        });
      })
      // ── Board sync broadcast ──
      .on('broadcast', { event: 'board-update' }, (payload) => {
        if (payload.payload.user_id === user.id) return;

        const { ops, objects } = payload.payload;

        if (ops) {
          ignoreNextUpdate.current = true;
          setBoardObjects(prev => {
            let next = prev;
            for (const op of ops) {
              if (op.type === 'create') {
                if (!next.some(o => o.id === op.data.id)) {
                  next = [...next, op.data];
                }
              } else if (op.type === 'delete') {
                next = next.filter(o => o.id !== op.id);
              } else if (op.type === 'update') {
                next = next.map(o => o.id === op.data.id ? op.data : o);
              }
            }
            return next;
          });
        } else if (objects) {
          ignoreNextUpdate.current = true;
          setBoardObjects(objects);
        }
      })
      // ── Database fallback (postgres_changes) ──
      // Catches changes saved by autosave from other users even if broadcast was missed.
      // Requires the 'boards' table to be added to the supabase_realtime publication.
      // If not enabled, this listener simply never fires (safe no-op).
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'boards',
        filter: `id=eq.${boardId}`,
      }, (payload) => {
        // Ignore changes triggered by our own recent autosave
        if (Date.now() - lastLocalSaveTime.current < 3000) return;

        const remote = payload.new;
        if (!remote?.board_data) return;

        const data = typeof remote.board_data === 'string'
          ? JSON.parse(remote.board_data)
          : remote.board_data;
        const remoteObjects = data?.objects;
        if (!remoteObjects) return;

        // Quick heuristic: skip if same object count and first/last IDs match
        // (avoids full-replacing when our state is already up to date)
        const local = boardObjectsRef.current;
        if (
          local.length === remoteObjects.length &&
          local.length > 0 &&
          local[0]?.id === remoteObjects[0]?.id &&
          local[local.length - 1]?.id === remoteObjects[remoteObjects.length - 1]?.id
        ) {
          return;
        }

        ignoreNextUpdate.current = true;
        setBoardObjects(remoteObjects);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          // Sync the baseline to current state
          prevObjectsRef.current = boardObjectsRef.current;
          // Track presence
          await channel.track({
            user_id: user.id,
            email: user.email,
            display_name: getDisplayName(user),
            online_at: new Date().toISOString(),
          });
          syncUsers();
        }
      });

    return () => {
      channelRef.current = null;
      clearTimeout(pendingCursorUpdate.current);
      clearTimeout(trailingTimeout.current);
      trailingTimeout.current = null;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, user?.id, setBoardObjects]);

  // ──────────────────────────────────────────────────
  // Cursor update (throttled)
  // ──────────────────────────────────────────────────
  const updateCursor = useCallback((x, y) => {
    const channel = channelRef.current;
    const u = userRef.current;
    if (!channel || !u) return;

    const now = Date.now();
    const elapsed = now - lastCursorUpdate.current;

    const doSend = () => {
      channel.send({
        type: 'broadcast',
        event: 'cursor-update',
        payload: { user_id: u.id, x, y },
      });
    };

    if (elapsed >= CURSOR_THROTTLE_MS) {
      lastCursorUpdate.current = now;
      doSend();
    } else {
      clearTimeout(pendingCursorUpdate.current);
      pendingCursorUpdate.current = setTimeout(() => {
        lastCursorUpdate.current = Date.now();
        doSend();
      }, CURSOR_THROTTLE_MS - elapsed);
    }
  }, []);

  // ──────────────────────────────────────────────────
  // Board sync: broadcast local changes as deltas
  // ──────────────────────────────────────────────────
  const broadcastNow = useCallback((prev, curr) => {
    if (!channelRef.current || !user?.id) return;

    const prevMap = new Map(prev.map(o => [o.id, o]));
    const currMap = new Map(curr.map(o => [o.id, o]));
    const ops = [];

    for (const obj of curr) {
      const prevObj = prevMap.get(obj.id);
      if (!prevObj) ops.push({ type: 'create', data: obj });
      else if (prevObj !== obj) ops.push({ type: 'update', data: obj });
    }
    for (const obj of prev) {
      if (!currMap.has(obj.id)) ops.push({ type: 'delete', id: obj.id });
    }

    if (ops.length === 0) return;

    if (ops.length > curr.length * 0.5) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'board-update',
        payload: { objects: curr, user_id: user.id, timestamp: Date.now() },
      });
    } else {
      channelRef.current.send({
        type: 'broadcast',
        event: 'board-update',
        payload: { ops, user_id: user.id, timestamp: Date.now() },
      });
    }

    prevObjectsRef.current = curr;
    lastBroadcastTime.current = Date.now();
  }, [user?.id]);

  // Debounced broadcast effect (leading + trailing edge)
  useEffect(() => {
    if (!boardId || !user?.id) return;

    if (ignoreNextUpdate.current) {
      ignoreNextUpdate.current = false;
      prevObjectsRef.current = boardObjects;
      return;
    }

    const prev = prevObjectsRef.current;
    const curr = boardObjects;
    if (prev === curr) return;

    const now = Date.now();
    const elapsed = now - lastBroadcastTime.current;

    if (trailingTimeout.current) {
      clearTimeout(trailingTimeout.current);
      trailingTimeout.current = null;
    }

    if (elapsed >= SYNC_DEBOUNCE_MS) {
      broadcastNow(prev, curr);
    } else {
      trailingTimeout.current = setTimeout(() => {
        trailingTimeout.current = null;
        broadcastNow(prevObjectsRef.current, boardObjectsRef.current);
      }, SYNC_DEBOUNCE_MS - elapsed);
    }

    return () => {
      if (trailingTimeout.current) {
        clearTimeout(trailingTimeout.current);
        trailingTimeout.current = null;
      }
    };
  }, [boardObjects, boardId, user?.id, broadcastNow]);

  // ──────────────────────────────────────────────────
  // Expose lastLocalSaveTime so autosave can mark it
  // ──────────────────────────────────────────────────
  const markLocalSave = useCallback(() => {
    lastLocalSaveTime.current = Date.now();
  }, []);

  return { onlineUsers, cursors, updateCursor, markLocalSave };
}
