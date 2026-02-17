import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useBoardSync(boardId, boardObjects, setBoardObjects, user) {
  const channelRef = useRef(null);
  const ignoreNextUpdate = useRef(false);

  // Subscribe to the channel once per board/user
  useEffect(() => {
    if (!boardId || !user) return;

    const channel = supabase.channel(`board-sync:${boardId}`);

    channel
      .on('broadcast', { event: 'board-update' }, (payload) => {
        if (payload.payload.user_id === user.id) return;
        ignoreNextUpdate.current = true;
        setBoardObjects(payload.payload.objects);
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

  // Broadcast local changes to other users
  useEffect(() => {
    if (!boardId || !user) return;

    if (ignoreNextUpdate.current) {
      ignoreNextUpdate.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'board-update',
          payload: {
            objects: boardObjects,
            user_id: user.id,
            timestamp: Date.now(),
          },
        });
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [boardObjects, boardId, user]);
}
