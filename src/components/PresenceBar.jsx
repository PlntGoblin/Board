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

export default function PresenceBar({ users, currentUser }) {
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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      {uniqueUsers.map((u) => {
        const isCurrentUser = u.user_id === currentUser?.id;
        const color = getColor(u.user_id);
        const name = u.display_name || u.email || 'User';

        return (
          <div
            key={u.user_id}
            title={`${name}${isCurrentUser ? ' (you)' : ''}`}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: color,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              border: isCurrentUser ? '2px solid #333' : '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              cursor: 'default',
            }}
          >
            {getInitials(name)}
          </div>
        );
      })}
      {uniqueUsers.length > 0 && (
        <span style={{
          fontSize: '12px',
          color: '#888',
          marginLeft: '4px',
        }}>
          {uniqueUsers.length} online
        </span>
      )}
    </div>
  );
}
