import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function usePresence(boardId, user) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const channelRef = useRef(null);
  const lastCursorUpdate = useRef(0);
  const pendingCursorUpdate = useRef(null);

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
      .on('presence', { event: 'leave' }, syncUsers)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = presenceChannel;
          await presenceChannel.track({
            user_id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
            online_at: new Date().toISOString(),
            cursor: { x: 0, y: 0 },
          });
        }
      });

    return () => {
      channelRef.current = null;
      clearTimeout(pendingCursorUpdate.current);
      supabase.removeChannel(presenceChannel);
    };
  }, [boardId, user]);

  const updateCursor = useCallback((x, y) => {
    const channel = channelRef.current;
    if (!channel || !user) return;

    const now = Date.now();
    const elapsed = now - lastCursorUpdate.current;

    if (elapsed >= 50) {
      lastCursorUpdate.current = now;
      channel.track({
        user_id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        online_at: new Date().toISOString(),
        cursor: { x, y },
      });
    } else {
      clearTimeout(pendingCursorUpdate.current);
      pendingCursorUpdate.current = setTimeout(() => {
        lastCursorUpdate.current = Date.now();
        channel.track({
          user_id: user.id,
          email: user.email,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
          online_at: new Date().toISOString(),
          cursor: { x, y },
        });
      }, 50 - elapsed);
    }
  }, [user]);

  return { onlineUsers, updateCursor };
}
