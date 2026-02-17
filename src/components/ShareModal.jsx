import { useState } from 'react';
import { X, Copy, Check, Globe, Lock, UserPlus } from 'lucide-react';
import { useBoard } from '../hooks/useBoard';

export default function ShareModal({ boardId, isPublic: initialPublic = true, onClose }) {
  const { shareBoard, toggleVisibility } = useBoard();
  const [email, setEmail] = useState('');
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const boardUrl = `${window.location.origin}/board/${boardId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(boardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = boardUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTogglePublic = async () => {
    try {
      await toggleVisibility(boardId, !isPublic);
      setIsPublic(!isPublic);
    } catch (err) {
      setError('Failed to update visibility');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await shareBoard(boardId, email.trim());
      setSuccess(`Invited ${email.trim()}`);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '28px',
          width: '440px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>
            Share Board
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Copy Link */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
            Board Link
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={boardUrl}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#666',
                background: '#f9f9f9',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCopyLink}
              style={{
                padding: '10px 16px',
                background: copied ? '#4caf50' : '#f5f5f5',
                color: copied ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
        </div>

        {/* Visibility Toggle */}
        <div style={{
          marginBottom: '20px',
          padding: '14px',
          background: '#f9f9f9',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isPublic ? <Globe size={18} color="#4caf50" /> : <Lock size={18} color="#999" />}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                {isPublic ? 'Public' : 'Private'}
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>
                {isPublic ? 'Anyone with the link can view' : 'Only invited users can access'}
              </div>
            </div>
          </div>
          <button
            onClick={handleTogglePublic}
            style={{
              padding: '6px 14px',
              background: isPublic ? '#e8f5e9' : '#f5f5f5',
              color: isPublic ? '#2e7d32' : '#666',
              border: `1px solid ${isPublic ? '#a5d6a7' : '#ddd'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {isPublic ? 'Make Private' : 'Make Public'}
          </button>
        </div>

        {/* Invite by Email */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
            Invite Collaborator
          </label>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                padding: '10px 16px',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              <UserPlus size={14} />
              Invite
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: '#fce4ec',
              borderRadius: '6px',
              color: '#c62828',
              fontSize: '12px',
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: '#e8f5e9',
              borderRadius: '6px',
              color: '#2e7d32',
              fontSize: '12px',
            }}>
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
