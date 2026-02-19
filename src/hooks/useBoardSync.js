import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SYNC_DEBOUNCE_MS } from '../lib/config';

export function useBoardSync(boardId, boardObjects, setBoardObjects, user) {
  const channelRef = useRef(null);
  const ignoreNextUpdate = useRef(false);
  const prevObjectsRef = useRef(boardObjects);
  const boardObjectsRef = useRef(boardObjects);
  const lastBroadcastTime = useRef(0);
  const trailingTimeout = useRef(null);

  // Always keep boardObjectsRef current so async callbacks can read the latest state
  boardObjectsRef.current = boardObjects;

  // Subscribe to the channel once per board/user
  // Use user?.id (stable string) instead of user (object ref) to avoid
  // tearing down the channel on every auth token refresh
  useEffect(() => {
    if (!boardId || !user?.id) return;

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
                // Guard against duplicates (e.g. during channel reconnection)
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
          // Fallback: full state replacement
          ignoreNextUpdate.current = true;
          setBoardObjects(objects);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          // Sync the baseline to whatever is loaded now so we don't
          // re-broadcast the entire board as fresh creates on the first change
          prevObjectsRef.current = boardObjectsRef.current;
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [boardId, user?.id, setBoardObjects]);

  const broadcastNow = useCallback((prev, curr) => {
    if (!channelRef.current || !user?.id) return;

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
  }, [user?.id]);

  // Broadcast local changes as deltas — leading + trailing edge
  // Also handles ignoreNextUpdate in the same effect to avoid race conditions
  // with a separate no-deps effect consuming the flag first
  useEffect(() => {
    if (!boardId || !user?.id) return;

    // If this render was triggered by a remote update we just applied,
    // update the baseline and skip broadcasting
    if (ignoreNextUpdate.current) {
      ignoreNextUpdate.current = false;
      prevObjectsRef.current = boardObjects;
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
      // Use refs (not closure values) so the timeout always reads the latest state
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
}
