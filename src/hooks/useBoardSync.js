import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useBoardSync(boardId, boardObjects, setBoardObjects, user) {
  const ignoreNextUpdate = useRef(false);
  const lastUpdateTime = useRef(Date.now());

  useEffect(() => {
    if (!boardId || !user) return;

    const channel = supabase.channel(`board-sync:${boardId}`);

    // Listen for board updates from other users
    channel
      .on('broadcast', { event: 'board-update' }, (payload) => {
        // Don't apply our own updates
        if (payload.payload.user_id === user.id) return;

        // Don't apply if we just sent an update (debounce)
        if (Date.now() - lastUpdateTime.current < 100) return;

        ignoreNextUpdate.current = true;
        setBoardObjects(payload.payload.objects);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, user, setBoardObjects]);

  // Broadcast board changes to other users
  useEffect(() => {
    if (!boardId || !user) return;
    if (ignoreNextUpdate.current) {
      ignoreNextUpdate.current = false;
      return;
    }

    const channel = supabase.channel(`board-sync:${boardId}`);

    const timeoutId = setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'board-update',
        payload: {
          objects: boardObjects,
          user_id: user.id,
          timestamp: Date.now(),
        },
      });
      lastUpdateTime.current = Date.now();
    }, 100); // Debounce broadcasts

    return () => clearTimeout(timeoutId);
  }, [boardObjects, boardId, user]);
}
