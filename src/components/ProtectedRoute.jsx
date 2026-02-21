import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBoard } from '../hooks/useBoard';
import AuthModal from './AuthModal';

export default function ProtectedRoute({ children }) {
  const { user, loading, isGuest } = useAuth();
  const { createBoard, listBoards } = useBoard();
  const navigate = useNavigate();
  const location = useLocation();
  const [guestRedirecting, setGuestRedirecting] = useState(false);
  const [guestError, setGuestError] = useState(null);

  useEffect(() => {
    if (user && isGuest && location.pathname === '/' && !guestRedirecting && !guestError) {
      setGuestRedirecting(true);
      listBoards().then((boards) => {
        if (boards.length > 0) {
          navigate(`/board/${boards[0].id}`, { replace: true });
        } else {
          return createBoard('Guest Board').then((board) => {
            navigate(`/board/${board.id}`, { replace: true });
          });
        }
      }).catch((err) => {
        console.error('Guest board setup failed:', err);
        setGuestRedirecting(false);
        setGuestError(err.message || 'Failed to set up guest board');
      });
    }
  }, [user, isGuest, location.pathname, guestRedirecting, guestError, listBoards, createBoard, navigate]);

  if (loading || guestRedirecting) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f1626', fontSize: '16px', color: '#8892b0',
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {guestRedirecting ? 'Setting up your board...' : 'Loading...'}
      </div>
    );
  }

  if (!user) {
    return <AuthModal redirectTo={window.location.pathname} />;
  }

  if (guestError) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '16px', background: '#0f1626', fontFamily: "'Space Grotesk', sans-serif",
      }}>
        <p style={{ color: '#ef5350', fontSize: '14px' }}>{guestError}</p>
        <button
          onClick={() => { setGuestError(null); setGuestRedirecting(false); }}
          style={{
            padding: '8px 20px', background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
            color: '#e0e8f8', fontSize: '14px', cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return children;
}
