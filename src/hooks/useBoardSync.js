import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SYNC_DEBOUNCE_MS } from '../lib/config';

export function useBoardSync(boardId, boardObjects, setBoardObjects, user) {
  const channelRef = useRef(null);
  const ignoreNextUpdate = useRef(false);
  const prevObjectsRef = useRef(boardObjects);
  const lastBroadcastTime = useRef(0);
  const trailingTimeout = useRef(null);

  // Keep prevObjectsRef in sync (but skip when we just applied remote ops)
  useEffect(() => {
    if (ignoreNextUpdate.current) {
      ignoreNextUpdate.current = false;
      prevObjectsRef.current = boardObjects;
      return;
    }
  });

  // Subscribe to the channel once per board/user
  useEffect(() => {
    if (!boardId || !user) return;

    const channel = supabase.channel(`board-sync:${boardId}`);

    channel
      .on('broadcast', { event: 'board-update' }, (payload) => {
        if (payload.payload.user_id === user.id) return;

        const { ops, objects } = payload.payload;

        // Delta sync: apply operations
        if (ops) {
          ignoreNextUpdate.current = true;
          setBoardObjects(prev => {
            let next = prev;
            for (const op of ops) {
              if (op.type === 'create') {
                next = [...next, op.data];
              } else if (op.type === 'delete') {
                next = next.filter(o => o.id !== op.id);
              } else if (op.type === 'update') {
                next = next.map(o => o.id === op.data.id ? op.data : o);
              }
            }
            return next;
          });
        } else if (objects) {
          // Fallback: full state replacement
          ignoreNextUpdate.current = true;
          setBoardObjects(objects);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [boardId, user, setBoardObjects]);

  const broadcastNow = useCallback((prev, curr) => {
    if (!channelRef.current) return;

    // Compute delta
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

    // For very large diffs (e.g. template load, clear), send full state instead
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
  }, [user]);

  // Broadcast local changes as deltas — leading + trailing edge
  useEffect(() => {
    if (!boardId || !user) return;

    if (ignoreNextUpdate.current) {
      // This was a remote update we just applied — don't re-broadcast
      return;
    }

    const prev = prevObjectsRef.current;
    const curr = boardObjects;

    // Same reference = no change
    if (prev === curr) return;

    const now = Date.now();
    const elapsed = now - lastBroadcastTime.current;

    // Clear any pending trailing timeout
    if (trailingTimeout.current) {
      clearTimeout(trailingTimeout.current);
      trailingTimeout.current = null;
    }

    if (elapsed >= SYNC_DEBOUNCE_MS) {
      // Leading edge: enough time has passed, send immediately
      broadcastNow(prev, curr);
    } else {
      // Trailing edge: schedule for remaining time
      trailingTimeout.current = setTimeout(() => {
        trailingTimeout.current = null;
        broadcastNow(prevObjectsRef.current, boardObjects);
      }, SYNC_DEBOUNCE_MS - elapsed);
    }

    return () => {
      if (trailingTimeout.current) {
        clearTimeout(trailingTimeout.current);
        trailingTimeout.current = null;
      }
    };
  }, [boardObjects, boardId, user, broadcastNow]);
}
