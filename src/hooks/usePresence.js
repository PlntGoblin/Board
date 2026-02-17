import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePresence(boardId, user) {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!boardId || !user) return;

    const channel = supabase.channel(`board:${boardId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, user]);

  return onlineUsers;
}
