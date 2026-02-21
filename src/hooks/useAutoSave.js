import { useState, useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '../lib/config';

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

    let aborted = false;
    setSaveStatus('unsaved');
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (aborted) return;
      try {
        setSaveStatus('saving');
        await saveBoard(boardId, { objects: boardObjects, nextId });
        if (!aborted) setSaveStatus('saved');
      } catch {
        if (!aborted) setSaveStatus('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      aborted = true;
      clearTimeout(timeoutRef.current);
    };
  }, [boardId, boardObjects, nextId, saveBoard]);

  return saveStatus;
}
