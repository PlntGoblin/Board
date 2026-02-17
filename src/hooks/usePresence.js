import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function usePresence(boardId, user) {
  const [onlineUsers, setOnlineUsers] = useState([]);
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

    const doTrack = () => {
      channel.track({
        user_id: u.id,
        email: u.email,
        display_name: u.user_metadata?.display_name || u.email?.split('@')[0] || 'User',
        online_at: new Date().toISOString(),
        cursor: { x, y },
      });
    };

    if (elapsed >= 50) {
      lastCursorUpdate.current = now;
      doTrack();
    } else {
      clearTimeout(pendingCursorUpdate.current);
      pendingCursorUpdate.current = setTimeout(() => {
        lastCursorUpdate.current = Date.now();
        doTrack();
      }, 50 - elapsed);
    }
  }, []);

  return { onlineUsers, updateCursor };
}
