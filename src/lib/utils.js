export function getDisplayName(user) {
  return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
}
