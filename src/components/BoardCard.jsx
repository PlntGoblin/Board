import { Trash2, Globe, Lock } from 'lucide-react';

export default function BoardCard({ board, onClick, onDelete }) {
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        border: '1px solid #e8e8e8',
        transition: 'all 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#667eea';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e8e8e8';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Preview area */}
      <div style={{
        height: '120px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        color: '#bbb',
      }}>
        &#x1f4cb;
      </div>

      {/* Title */}
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1a1a1a',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {board.title}
      </h3>

      {/* Meta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#999',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {board.is_public ? <Globe size={12} /> : <Lock size={12} />}
          <span>{board.is_public ? 'Public' : 'Private'}</span>
          {board.role === 'collaborator' && (
            <span style={{
              background: '#e3f2fd',
              color: '#1976d2',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px',
            }}>
              Shared
            </span>
          )}
        </div>
        <span>{timeAgo(board.updated_at)}</span>
      </div>

      {/* Delete button */}
      {board.role !== 'collaborator' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this board?')) onDelete();
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '6px',
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.color = '#e53935';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6';
            e.currentTarget.style.color = '#999';
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
