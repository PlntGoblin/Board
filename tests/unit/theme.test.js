import { describe, it, expect } from 'vitest';
import {
  darkTheme,
  lightTheme,
  COLOR_MAP,
  getColor,
  STICKY_COLORS,
  SHAPE_COLORS,
  FONT_SIZES,
  STROKE_SIZES,
  TEXT_COLORS,
  DRAW_COLORS,
} from '../../src/lib/theme.js';

const REQUIRED_THEME_KEYS = [
  'bg', 'surface', 'surfaceHover', 'border', 'borderLight',
  'text', 'textSecondary', 'textMuted', 'gridLine', 'divider',
  'canvasBg', 'inputFocusBg',
];

describe('darkTheme', () => {
  it('has all required keys', () => {
    for (const key of REQUIRED_THEME_KEYS) {
      expect(darkTheme).toHaveProperty(key);
    }
  });

  it('has dark background colors', () => {
    // Dark theme backgrounds should be dark (start with low hex values)
    expect(darkTheme.canvasBg).toMatch(/^#[0-2]/);
  });
});

describe('lightTheme', () => {
  it('has all required keys', () => {
    for (const key of REQUIRED_THEME_KEYS) {
      expect(lightTheme).toHaveProperty(key);
    }
  });

  it('has the same keys as darkTheme', () => {
    expect(Object.keys(lightTheme).sort()).toEqual(Object.keys(darkTheme).sort());
  });
});

describe('getColor', () => {
  it('maps named colors to hex values', () => {
    expect(getColor('yellow')).toBe('#FFF59D');
    expect(getColor('pink')).toBe('#F48FB1');
    expect(getColor('blue')).toBe('#81D4FA');
  });

  it('passes through hex values unchanged', () => {
    expect(getColor('#FF0000')).toBe('#FF0000');
    expect(getColor('#abc123')).toBe('#abc123');
  });

  it('returns unknown strings as-is', () => {
    expect(getColor('notacolor')).toBe('notacolor');
  });
});

describe('COLOR_MAP', () => {
  it('has 7 color entries', () => {
    expect(Object.keys(COLOR_MAP)).toHaveLength(7);
  });

  it('includes all sticky note colors', () => {
    for (const name of STICKY_COLORS) {
      expect(COLOR_MAP).toHaveProperty(name);
    }
  });
});

describe('STICKY_COLORS', () => {
  it('has 6 colors', () => {
    expect(STICKY_COLORS).toHaveLength(6);
  });

  it('includes expected color names', () => {
    expect(STICKY_COLORS).toContain('yellow');
    expect(STICKY_COLORS).toContain('pink');
    expect(STICKY_COLORS).toContain('blue');
  });
});

describe('SHAPE_COLORS', () => {
  it('has 7 items', () => {
    expect(SHAPE_COLORS).toHaveLength(7);
  });

  it('each item has name and hex', () => {
    for (const c of SHAPE_COLORS) {
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('hex');
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('FONT_SIZES', () => {
  it('has 3 sizes (S, M, L)', () => {
    expect(FONT_SIZES).toHaveLength(3);
    expect(FONT_SIZES.map(f => f.label)).toEqual(['S', 'M', 'L']);
  });

  it('sizes increase from S to L', () => {
    expect(FONT_SIZES[0].value).toBeLessThan(FONT_SIZES[1].value);
    expect(FONT_SIZES[1].value).toBeLessThan(FONT_SIZES[2].value);
  });
});

describe('STROKE_SIZES', () => {
  it('has 4 sizes', () => {
    expect(STROKE_SIZES).toHaveLength(4);
  });

  it('values increase', () => {
    for (let i = 1; i < STROKE_SIZES.length; i++) {
      expect(STROKE_SIZES[i].value).toBeGreaterThan(STROKE_SIZES[i - 1].value);
    }
  });
});

describe('TEXT_COLORS', () => {
  it('has entries with name and valid hex', () => {
    expect(TEXT_COLORS.length).toBeGreaterThan(0);
    for (const c of TEXT_COLORS) {
      expect(c).toHaveProperty('name');
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('DRAW_COLORS', () => {
  it('has 10 colors', () => {
    expect(DRAW_COLORS).toHaveLength(10);
  });

  it('all are valid hex strings', () => {
    for (const c of DRAW_COLORS) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
