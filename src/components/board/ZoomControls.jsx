import { Minus, Plus, Maximize2 } from 'lucide-react';

export default function ZoomControls({
  zoom, setZoom, zoomIn, zoomOut, fitToScreen,
  showZoomMenu, setShowZoomMenu, darkMode, theme,
}) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', bottom: '16px', right: '16px', zIndex: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px',
      }}
    >
      {showZoomMenu && (
        <div style={{
          background: theme.surface, borderRadius: '12px',
          boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden', minWidth: '180px',
          animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <button
            onClick={() => { fitToScreen(); setShowZoomMenu(false); }}
            style={{
              width: '100%', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'none', border: 'none',
              borderBottom: `1px solid ${theme.divider}`,
              cursor: 'pointer', fontSize: '13px', color: theme.text, textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Maximize2 size={15} color={theme.textSecondary} />
            Fit to screen
          </button>
          {[2, 1.5, 1, 0.5].map(level => {
            const isActive = Math.round(zoom * 100) === Math.round(level * 100);
            const activeBg = darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff';
            return (
              <button
                key={level}
                onClick={() => { setZoom(level); setShowZoomMenu(false); }}
                style={{
                  width: '100%', padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: isActive ? activeBg : 'none',
                  border: 'none',
                  borderBottom: level !== 0.5 ? `1px solid ${theme.divider}` : 'none',
                  cursor: 'pointer', fontSize: '13px',
                  color: isActive ? '#667eea' : theme.text,
                  fontWeight: isActive ? '600' : '400', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = theme.surfaceHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? activeBg : 'none'; }}
              >
                <Plus size={15} color={theme.textMuted} />
                {Math.round(level * 100)}%
              </button>
            );
          })}
        </div>
      )}

      <div style={{
        background: theme.surface, borderRadius: '8px',
        boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        <button
          onClick={zoomOut}
          title="Zoom out"
          style={{
            width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none',
            borderRight: `1px solid ${theme.borderLight}`,
            cursor: 'pointer', color: theme.textSecondary,
          }}
          onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => setShowZoomMenu(prev => !prev)}
          title="Zoom options"
          style={{
            padding: '0 10px', height: '30px',
            background: showZoomMenu ? (darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff') : 'none',
            border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
            color: showZoomMenu ? '#667eea' : theme.text,
            minWidth: '58px', letterSpacing: '-0.3px',
          }}
          onMouseEnter={e => { if (!showZoomMenu) e.currentTarget.style.background = theme.surfaceHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = showZoomMenu ? (darkMode ? 'rgba(102,126,234,0.15)' : '#f0f4ff') : 'none'; }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          title="Zoom in"
          style={{
            width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none',
            borderLeft: `1px solid ${theme.borderLight}`,
            cursor: 'pointer', color: theme.textSecondary,
          }}
          onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
