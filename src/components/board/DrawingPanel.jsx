import { DRAW_COLORS } from '../../lib/theme';

export default function DrawingPanel({ drawColor, setDrawColor, strokeWidth, setStrokeWidth, darkMode, theme }) {
  return (
    <div style={{
      position: 'absolute', left: '88px', top: '16px',
      background: theme.surface, borderRadius: '12px',
      boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
      padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px',
      zIndex: 10, animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {DRAW_COLORS.map(color => (
          <button
            key={color}
            onClick={() => setDrawColor(color)}
            title={color}
            style={{
              width: '28px', height: '28px', borderRadius: '6px', background: color,
              border: drawColor === color ? '3px solid #2196F3' : color === '#FFFFFF' ? `2px solid ${theme.borderLight}` : '2px solid transparent',
              cursor: 'pointer', padding: 0, transition: 'transform 0.1s',
              transform: drawColor === color ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      <div style={{ height: '1px', background: theme.divider }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        {[2, 4, 8].map(w => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            title={`${w}px`}
            style={{
              width: '44px', height: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: strokeWidth === w ? (darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff') : 'transparent',
              border: strokeWidth === w ? '1.5px solid #667eea' : '1.5px solid transparent',
              borderRadius: '6px', cursor: 'pointer', padding: '0 6px',
            }}
          >
            <div style={{ width: '100%', height: `${w}px`, borderRadius: w, background: drawColor === '#FFFFFF' ? '#ccc' : drawColor }} />
          </button>
        ))}
      </div>
    </div>
  );
}
