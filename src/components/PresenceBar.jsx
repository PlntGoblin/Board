import { useState, useRef, useEffect, useMemo } from 'react';

const PRESENCE_MESSAGES = [
  "Another mind enters the orbit ✨",
  "Crew expanding 🚀",
  "More brains in the galaxy 🧠",
  "Welcome to the mission 👩‍🚀👨‍🚀",
  "Ideas love company 💡",
  "Collaboration level: increasing",
  "The universe just got smarter 😉",
];

const COLORS = [
  '#667eea', '#764ba2', '#f5576c', '#4facfe',
  '#43e97b', '#fa709a', '#fee140', '#a18cd1',
];

function getColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(/[\s@]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const MAX_VISIBLE = 3;

export default function PresenceBar({ users, currentUser, theme }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const [headerMsg, setHeaderMsg] = useState(() =>
    PRESENCE_MESSAGES[Math.floor(Math.random() * PRESENCE_MESSAGES.length)]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!users || users.length === 0) return null;

  // Deduplicate by user_id
  const uniqueUsers = [];
  const seen = new Set();
  for (const u of users) {
    if (!seen.has(u.user_id)) {
      seen.add(u.user_id);
      uniqueUsers.push(u);
    }
  }

  const visible = uniqueUsers.slice(0, MAX_VISIBLE);
  const overflow = uniqueUsers.length - MAX_VISIBLE;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => {
          if (!open) setHeaderMsg(PRESENCE_MESSAGES[Math.floor(Math.random() * PRESENCE_MESSAGES.length)]);
          setOpen(!open);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        {visible.map((u, i) => {
          const color = u.avatar_color || getColor(u.user_id);
          const name = u.display_name || u.email || 'User';
          const emoji = u.avatar_emoji;

          return (
            <div
              key={u.user_id}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: emoji ? '14px' : '10px',
                fontWeight: '700',
                border: `2px solid ${theme?.surface || '#1a1a2e'}`,
                marginLeft: i === 0 ? 0 : '-8px',
                zIndex: MAX_VISIBLE - i,
              }}
            >
              {emoji || getInitials(name)}
            </div>
          );
        })}
        {overflow > 0 && (
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: theme?.surfaceHover || '#2a2a3e',
              color: theme?.textSecondary || '#888',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
              border: `2px solid ${theme?.surface || '#1a1a2e'}`,
              marginLeft: '-8px',
              zIndex: 0,
            }}
          >
            +{overflow}
          </div>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: theme?.surface || '#1a1a2e',
          border: `1px solid ${theme?.border || 'rgba(255,255,255,0.1)'}`,
          borderRadius: '10px',
          padding: '6px 0',
          minWidth: '180px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 1000,
        }}>
          <div style={{
            padding: '6px 12px 8px',
            fontSize: '11px',
            fontWeight: '600',
            color: theme?.textMuted || '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {headerMsg}
          </div>
          {uniqueUsers.map((u) => {
            const isCurrentUser = u.user_id === currentUser?.id;
            const color = u.avatar_color || getColor(u.user_id);
            const name = u.display_name || u.email || 'User';
            const emoji = u.avatar_emoji;

            return (
              <div
                key={u.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 12px',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: emoji ? '13px' : '9px',
                  fontWeight: '700',
                  flexShrink: 0,
                }}>
                  {emoji || getInitials(name)}
                </div>
                <span style={{
                  fontSize: '13px',
                  color: theme?.text || '#f0f4ff',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {name}{isCurrentUser ? ' (you)' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
