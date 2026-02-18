import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { API_URL } from '../lib/config';

export function useBoard() {
  const { session } = useAuth();

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }), [session]);

  const createBoard = useCallback(async (title) => {
    const res = await fetch(`${API_URL}/api/boards`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create board');
    return res.json();
  }, [headers]);

  const listBoards = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/boards`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error('Failed to list boards');
    return res.json();
  }, [headers]);

  const loadBoard = useCallback(async (id) => {
    const res = await fetch(`${API_URL}/api/boards/${id}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error('Failed to load board');
    return res.json();
  }, [headers]);

  const saveBoard = useCallback(async (id, boardData, title) => {
    const body = {};
    if (boardData) body.board_data = boardData;
    if (title !== undefined) body.title = title;

    const res = await fetch(`${API_URL}/api/boards/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to save board');
    return res.json();
  }, [headers]);

  const deleteBoard = useCallback(async (id) => {
    const res = await fetch(`${API_URL}/api/boards/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) throw new Error('Failed to delete board');
    return res.json();
  }, [headers]);

  const shareBoard = useCallback(async (id, email, role = 'editor') => {
    const res = await fetch(`${API_URL}/api/boards/${id}/share`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to share board');
    }
    return res.json();
  }, [headers]);

  const toggleVisibility = useCallback(async (id, isPublic) => {
    const res = await fetch(`${API_URL}/api/boards/${id}/visibility`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ is_public: isPublic }),
    });
    if (!res.ok) throw new Error('Failed to update visibility');
    return res.json();
  }, [headers]);

  return { createBoard, listBoards, loadBoard, saveBoard, deleteBoard, shareBoard, toggleVisibility };
}
