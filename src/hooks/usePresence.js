import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function usePresence(boardId, user) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    if (!boardId || !user) return;

    const presenceChannel = supabase.channel(`board:${boardId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
            online_at: new Date().toISOString(),
            cursor: { x: 0, y: 0 },
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [boardId, user]);

  const updateCursor = useCallback((x, y) => {
    if (channel && user) {
      channel.track({
        user_id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        online_at: new Date().toISOString(),
        cursor: { x, y },
      });
    }
  }, [channel, user]);

  return { onlineUsers, updateCursor };
}
