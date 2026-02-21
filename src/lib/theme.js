export const darkTheme = {
  bg: '#1a1a2e',
  surface: '#16213e',
  surfaceHover: '#1a2744',
  border: '#2a3a5c',
  borderLight: '#243352',
  text: '#e0e0f0',
  textSecondary: '#8892b0',
  textMuted: '#5a6688',
  gridLine: '#243352',
  divider: '#2a3a5c',
  canvasBg: '#0f1626',
  inputFocusBg: '#1a2744',
};

export const lightTheme = {
  bg: '#f5f5f5',
  surface: 'white',
  surfaceHover: '#f5f5f5',
  border: '#e0e0e0',
  borderLight: '#eee',
  text: '#333',
  textSecondary: '#666',
  textMuted: '#999',
  gridLine: '#e8e8e8',
  divider: '#e0e0e0',
  canvasBg: '#f5f5f5',
  inputFocusBg: '#f5f5f5',
};

export const COLOR_MAP = {
  yellow: '#FFF59D',
  pink: '#F48FB1',
  blue: '#81D4FA',
  green: '#A5D6A7',
  purple: '#CE93D8',
  orange: '#FFAB91',
  white: '#FFFFFF',
};

export function getColor(color) {
  return COLOR_MAP[color] || color;
}

export const STICKY_COLORS = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];

export const SHAPE_COLORS = [
  { name: 'yellow', hex: '#FFF59D' },
  { name: 'pink', hex: '#F48FB1' },
  { name: 'blue', hex: '#81D4FA' },
  { name: 'green', hex: '#A5D6A7' },
  { name: 'purple', hex: '#CE93D8' },
  { name: 'orange', hex: '#FFAB91' },
  { name: 'white', hex: '#FFFFFF' },
];

export const FONT_SIZES = [
  { label: 'S', value: 13 },
  { label: 'M', value: 16 },
  { label: 'L', value: 22 },
];

export const STROKE_SIZES = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '4', value: 4 },
  { label: '6', value: 6 },
];

export const TEXT_COLORS = [
  { name: 'white', hex: '#FFFFFF' },
  { name: 'gray', hex: '#94a3b8' },
  { name: 'red', hex: '#FF5252' },
  { name: 'orange', hex: '#FF9800' },
  { name: 'green', hex: '#4CAF50' },
  { name: 'blue', hex: '#38bdf8' },
  { name: 'purple', hex: '#CE93D8' },
  { name: 'pink', hex: '#F48FB1' },
];

export const DRAW_COLORS = [
  '#8B8FA3', '#000000', '#FF5252',
  '#FF9800', '#FFEB3B',
  '#4CAF50', '#2196F3',
  '#9C27B0', '#E91E63',
  '#FFFFFF',
];
