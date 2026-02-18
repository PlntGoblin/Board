import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CURSOR_THROTTLE_MS } from '../lib/config';
import { getDisplayName } from '../lib/utils';

export function usePresence(boardId, user) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const channelRef = useRef(null);
  const userRef = useRef(user);
  const lastCursorUpdate = useRef(0);
  const pendingCursorUpdate = useRef(null);

  // Keep userRef current without re-running the channel effect
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!boardId || !user) return;

    const presenceChannel = supabase.channel(`board:${boardId}`);

    const syncUsers = () => {
      const state = presenceChannel.presenceState();
      const users = Object.values(state).flat();
      setOnlineUsers(users);
    };

    presenceChannel
      .on('presence', { event: 'sync' }, syncUsers)
      .on('presence', { event: 'join' }, syncUsers)
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        syncUsers();
        // Clean up cursors for departed users
        if (leftPresences) {
          setCursors(prev => {
            const next = { ...prev };
            let changed = false;
            for (const p of leftPresences) {
              if (next[p.user_id]) {
                delete next[p.user_id];
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }
      })
      .on('broadcast', { event: 'cursor-update' }, (payload) => {
        const { user_id, x, y } = payload.payload;
        if (user_id === user.id) return;
        setCursors(prev => {
          const existing = prev[user_id];
          if (existing && existing.x === x && existing.y === y) return prev;
          return { ...prev, [user_id]: { x, y } };
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = presenceChannel;
          // Track user info only (no cursor) — cursor goes via broadcast
          await presenceChannel.track({
            user_id: user.id,
            email: user.email,
            display_name: getDisplayName(user),
            online_at: new Date().toISOString(),
          });
          // Immediately read presence state after tracking
          syncUsers();
        }
      });

    return () => {
      channelRef.current = null;
      clearTimeout(pendingCursorUpdate.current);
      supabase.removeChannel(presenceChannel);
    };
  // Only re-subscribe when boardId changes, not on every user reference change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, user?.id]);

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

  return { onlineUsers, cursors, updateCursor };
}
