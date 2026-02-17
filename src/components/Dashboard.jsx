import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBoard } from '../hooks/useBoard';
import BoardCard from './BoardCard';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { listBoards, createBoard, deleteBoard } = useBoard();
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const data = await listBoards();
      setBoards(data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewBoard = async () => {
    try {
      const board = await createBoard('Untitled Board');
      navigate(`/board/${board.id}`);
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBoard(id);
      setBoards(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: '700',
          color: '#1a1a1a',
        }}>
          The Board
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#666',
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
          }}>
            My Boards
          </h2>
          <button
            onClick={handleNewBoard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            <Plus size={16} />
            New Board
          </button>
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px',
            color: '#999',
            fontSize: '15px',
          }}>
            Loading your boards...
          </div>
        ) : boards.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'white',
            borderRadius: '16px',
            border: '2px dashed #ddd',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              &#x1f3a8;
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
              No boards yet
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#888', fontSize: '14px' }}>
              Create your first AI-powered whiteboard
            </p>
            <button
              onClick={handleNewBoard}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Create Board
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {boards.map(board => (
              <BoardCard
                key={board.id}
                board={board}
                onClick={() => navigate(`/board/${board.id}`)}
                onDelete={() => handleDelete(board.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
