import { useState, useEffect, useRef } from 'react';

export function useAutoSave(boardId, boardObjects, nextId, saveBoard) {
  const [saveStatus, setSaveStatus] = useState('saved');
  const timeoutRef = useRef(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!boardId || !saveBoard) return;

    // Skip the first render (initial load from DB)
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    setSaveStatus('unsaved');
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await saveBoard(boardId, { objects: boardObjects, nextId });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);

    return () => clearTimeout(timeoutRef.current);
  }, [boardId, boardObjects, nextId, saveBoard]);

  return saveStatus;
}
