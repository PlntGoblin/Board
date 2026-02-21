export function getDisplayName(user) {
  if (user?.is_anonymous) return 'Guest';
  return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
}

export const AVATAR_EMOJIS = ['🚀', '🧑‍🚀', '👽', '🛸', '🌍', '🌙', '⭐', '🪐', '☄️', '🔭', '🌌', '👾'];
export const AVATAR_COLORS = ['#667eea', '#38bdf8', '#f472b6', '#4ade80', '#fb923c', '#a78bfa'];

export function getUserAvatar(user) {
  return {
    emoji: user?.user_metadata?.avatar_emoji || null,
    color: user?.user_metadata?.avatar_color || null,
  };
}
