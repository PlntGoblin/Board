import { describe, it, expect } from 'vitest';
import {
  getDisplayName,
  getUserAvatar,
  AVATAR_EMOJIS,
  AVATAR_COLORS,
} from '../../src/lib/utils.js';

describe('getDisplayName', () => {
  it('returns "Guest" for anonymous users', () => {
    expect(getDisplayName({ is_anonymous: true })).toBe('Guest');
  });

  it('returns display_name from user metadata', () => {
    const user = { user_metadata: { display_name: 'Daniel' } };
    expect(getDisplayName(user)).toBe('Daniel');
  });

  it('falls back to email username when no display_name', () => {
    const user = { email: 'daniel@example.com' };
    expect(getDisplayName(user)).toBe('daniel');
  });

  it('returns "User" when no data available', () => {
    expect(getDisplayName({})).toBe('User');
  });

  it('handles null/undefined user', () => {
    expect(getDisplayName(null)).toBe('User');
    expect(getDisplayName(undefined)).toBe('User');
  });
});

describe('getUserAvatar', () => {
  it('returns emoji and color from metadata', () => {
    const user = { user_metadata: { avatar_emoji: '🚀', avatar_color: '#667eea' } };
    const avatar = getUserAvatar(user);
    expect(avatar.emoji).toBe('🚀');
    expect(avatar.color).toBe('#667eea');
  });

  it('returns null for missing metadata', () => {
    const avatar = getUserAvatar({});
    expect(avatar.emoji).toBeNull();
    expect(avatar.color).toBeNull();
  });

  it('handles null/undefined user', () => {
    const avatar = getUserAvatar(null);
    expect(avatar.emoji).toBeNull();
    expect(avatar.color).toBeNull();
  });
});

describe('AVATAR_EMOJIS', () => {
  it('has 12 emojis', () => {
    expect(AVATAR_EMOJIS).toHaveLength(12);
  });

  it('contains space-themed emojis', () => {
    expect(AVATAR_EMOJIS).toContain('🚀');
    expect(AVATAR_EMOJIS).toContain('🪐');
  });
});

describe('AVATAR_COLORS', () => {
  it('has 6 colors', () => {
    expect(AVATAR_COLORS).toHaveLength(6);
  });

  it('all values are valid hex color strings', () => {
    for (const c of AVATAR_COLORS) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
