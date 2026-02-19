import { useState, useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '../lib/config';

export function useAutoSave(boardId, boardObjects, nextId, saveBoard, onSave) {
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
        if (onSave) onSave();
      } catch {
        setSaveStatus('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutRef.current);
  }, [boardId, boardObjects, nextId, saveBoard]);

  return saveStatus;
}
