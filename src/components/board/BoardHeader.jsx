import { ArrowLeft, Cloud, CloudOff, Loader, Share2, Trash2, UserPlus, LogOut } from 'lucide-react';
import PresenceBar from '../PresenceBar';

export default function BoardHeader({
  boardTitle, setBoardTitle, saveBoard, boardId, saveStatus,
  onlineUsers, user,
  onClear, hasBoardObjects, onShare, navigate, theme,
  isGuest, onSignUp, onSignOut,
}) {
  return (
    <div style={{
      padding: '10px 16px',
      background: theme.surface,
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '6px 10px', background: 'none',
          border: `1px solid ${theme.borderLight}`,
          borderRadius: '6px', cursor: 'pointer',
          color: theme.textSecondary, fontSize: '13px',
        }}
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <input
        type="text"
        value={boardTitle}
        onChange={(e) => setBoardTitle(e.target.value)}
        onBlur={() => saveBoard(boardId, null, boardTitle)}
        style={{
          border: 'none', outline: 'none', fontSize: '16px', fontWeight: '600',
          color: theme.text, padding: '4px 8px', borderRadius: '4px',
          background: 'transparent', minWidth: '200px',
        }}
        onFocus={(e) => e.target.style.background = theme.inputFocusBg}
        onBlurCapture={(e) => e.target.style.background = 'transparent'}
      />

      {!isGuest && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
          color: saveStatus === 'saved' ? '#4caf50' : saveStatus === 'saving' ? '#ff9800' : saveStatus === 'error' ? '#f44336' : theme.textMuted,
        }}>
          {saveStatus === 'saved' && <Cloud size={14} />}
          {saveStatus === 'saving' && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {saveStatus === 'unsaved' && <CloudOff size={14} />}
          {saveStatus === 'error' && <CloudOff size={14} />}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <PresenceBar users={onlineUsers} currentUser={user} theme={theme} />

      {hasBoardObjects && (
        <button
          onClick={onClear}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', background: 'none',
            border: '1px solid #ef5350',
            borderRadius: '6px', cursor: 'pointer',
            color: '#ef5350', fontSize: '13px',
          }}
        >
          <Trash2 size={13} />
          Clear
        </button>
      )}

      {isGuest ? (
        <>
          <button
            onClick={onSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', background: 'none',
              border: `1px solid ${theme.borderLight}`,
              borderRadius: '6px', cursor: 'pointer',
              color: theme.textSecondary, fontSize: '13px',
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
          <button
            onClick={onSignUp}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            }}
          >
            <UserPlus size={14} />
            Sign Up
          </button>
        </>
      ) : (
        <button
          onClick={onShare}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white', border: 'none', borderRadius: '6px',
            cursor: 'pointer', fontSize: '13px', fontWeight: '600',
          }}
        >
          <Share2 size={14} />
          Share
        </button>
      )}
    </div>
  );
}
