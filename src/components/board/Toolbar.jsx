import { memo, useState as useLocalState, useEffect, useRef } from 'react';
import {
  MousePointer, Hand, Pen, Eraser, Type, ArrowRight, Minus,
  StickyNote, Shapes, Square, Circle, Triangle, Diamond, Hexagon, Star,
  Frame,
  ChevronsUp, ChevronUp, ChevronDown, ChevronsDown,
  Undo, Redo, Trash2,
} from 'lucide-react';

const TOOLS = [
  { id: 'select', icon: MousePointer, label: 'Select' },
  { id: 'hand', icon: Hand, label: 'Hand' },
  { id: 'pen', icon: Pen, label: 'Draw' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'line', icon: Minus, label: 'Line' },
];

const STICKY_PICKER = [
  { id: 'yellow', color: '#FFF59D' },
  { id: 'pink', color: '#F48FB1' },
  { id: 'blue', color: '#81D4FA' },
  { id: 'green', color: '#A5D6A7' },
  { id: 'purple', color: '#CE93D8' },
  { id: 'orange', color: '#FFAB91' },
];

const SHAPE_PICKER = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'diamond', icon: Diamond, label: 'Diamond' },
  { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
  { id: 'star', icon: Star, label: 'Star' },
];

function ToolButton({ isActive, onClick, title, icon: Icon, theme, size = 20, bg, color }) {
  const [hovered, setHovered] = useLocalState(false);
  const [showTooltip, setShowTooltip] = useLocalState(false);
  const timerRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (hovered && title) {
      timerRef.current = setTimeout(() => setShowTooltip(true), 1000);
    } else {
      clearTimeout(timerRef.current);
      setShowTooltip(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [hovered, title]);

  const getTooltipPos = () => {
    if (!btnRef.current) return {};
    const r = btnRef.current.getBoundingClientRect();
    return { position: 'fixed', left: r.right + 8, top: r.top + r.height / 2, transform: 'translateY(-50%)' };
  };

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      style={{
        width: '44px', height: '44px', border: 'none', borderRadius: '8px',
        background: bg || (isActive ? '#2196F3' : 'transparent'),
        color: color || (isActive ? 'white' : theme.textSecondary),
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s', position: 'relative',
      }}
      onMouseEnter={(e) => { setHovered(true); if (!isActive) e.currentTarget.style.background = theme.surfaceHover; }}
      onMouseLeave={(e) => { setHovered(false); if (!isActive) e.currentTarget.style.background = bg || (isActive ? '#2196F3' : 'transparent'); }}
    >
      <Icon size={size} />
      {showTooltip && title && (
        <div style={{
          ...getTooltipPos(),
          background: '#1e293b', color: '#f0f0f5', padding: '6px 10px',
          borderRadius: '6px', fontSize: '12px', fontWeight: '500',
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 99999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          opacity: 1,
          animation: 'tooltipFadeIn 0.3s ease',
        }}>
          {title}
        </div>
      )}
    </button>
  );
}

export default memo(function Toolbar({
  activeTool, setActiveTool,
  showStickyMenu, setShowStickyMenu, showShapeMenu, setShowShapeMenu,
  stickyColor, setStickyColor, shapeType, setShapeType,
  selectedId, selectedIds,
  handleDelete, bringToFront, bringForward, sendBackward, sendToBack,
  handleUndo, handleRedo, historyIndex, historyLength,
  darkMode, theme,
}) {
  const hasSelection = selectedId || selectedIds.length > 0;

  return (
    <div className="toolbar-scroll" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{
      position: 'absolute', left: '16px', top: '16px',
      display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10,
      maxHeight: 'calc(100vh - 100px)',
      scrollbarWidth: 'none',
    }}>
      {/* Main tools */}
      <div style={{
        background: theme.surface, borderRadius: '12px',
        boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', padding: '8px', gap: '4px', alignItems: 'center',
      }}>
        {TOOLS.map(tool => (
          <ToolButton
            key={tool.id}
            isActive={activeTool === tool.id}
            onClick={() => { setActiveTool(tool.id); setShowStickyMenu(false); setShowShapeMenu(false); }}
            title={tool.label}
            icon={tool.icon}
            theme={theme}
          />
        ))}

        {/* Sticky Note with picker */}
        <div style={{ position: 'relative' }}>
          <ToolButton
            isActive={activeTool === 'sticky'}
            onClick={() => { setActiveTool('sticky'); setShowStickyMenu(!showStickyMenu); setShowShapeMenu(false); }}
            title="Sticky Note"
            icon={StickyNote}
            theme={theme}
          />
          {showStickyMenu && (
            <div style={{
              position: 'absolute', left: '64px', top: '0',
              background: theme.surface, borderRadius: '12px',
              boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
              padding: '10px', zIndex: 20,
              animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {STICKY_PICKER.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setStickyColor(c.id); setShowStickyMenu(false); }}
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      background: c.color,
                      border: stickyColor === c.id ? '3px solid #2196F3' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s', padding: 0,
                      transform: stickyColor === c.id ? 'scale(1.15)' : 'scale(1)',
                    }}
                    title={c.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Shape with picker */}
        <div style={{ position: 'relative' }}>
          <ToolButton
            isActive={activeTool === 'shape'}
            onClick={() => { setActiveTool('shape'); setShowShapeMenu(!showShapeMenu); setShowStickyMenu(false); }}
            title="Shapes"
            icon={Shapes}
            theme={theme}
          />
          {showShapeMenu && (
            <div style={{
              position: 'absolute', left: '64px', top: '0',
              background: theme.surface, borderRadius: '12px',
              boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
              padding: '10px', zIndex: 20,
              animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {SHAPE_PICKER.map(s => {
                  const SIcon = s.icon;
                  const isActive = shapeType === s.id;
                  const activeBg = darkMode ? 'rgba(33,150,243,0.15)' : '#e3f2fd';
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setShapeType(s.id); setShowShapeMenu(false); }}
                      title={s.label}
                      style={{
                        width: '28px', height: '28px', border: 'none', borderRadius: '6px',
                        background: isActive ? activeBg : 'transparent',
                        color: isActive ? '#2196F3' : theme.textSecondary,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                        transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = isActive ? activeBg : theme.surfaceHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? activeBg : 'transparent'; }}
                    >
                      <SIcon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Frame tool */}
        <ToolButton
          isActive={activeTool === 'frame'}
          onClick={() => { setActiveTool('frame'); setShowStickyMenu(false); setShowShapeMenu(false); }}
          title="Frame"
          icon={Frame}
          theme={theme}
        />

        {/* Selection-dependent controls */}
        {hasSelection && (
          <>
            <div style={{ width: '100%', height: '1px', background: theme.divider, margin: '8px 0' }} />
            {[
              { action: bringToFront, icon: ChevronsUp, label: 'Bring to Front' },
              { action: bringForward, icon: ChevronUp, label: 'Bring Forward' },
              { action: sendBackward, icon: ChevronDown, label: 'Send Backward' },
              { action: sendToBack, icon: ChevronsDown, label: 'Send to Back' },
            ].map(({ action, icon, label }) => (
              <ToolButton
                key={label}
                isActive={false}
                onClick={action}
                title={label}
                icon={icon}
                theme={theme}
              />
            ))}
            <div style={{ width: '100%', height: '1px', background: theme.divider, margin: '8px 0' }} />
            <ToolButton
              isActive={false}
              onClick={handleDelete}
              title="Delete (Del)"
              icon={Trash2}
              theme={theme}
              bg="#f44336"
              color="white"
            />
          </>
        )}
      </div>

      {/* Undo / Redo */}
      <div style={{
        background: theme.surface, borderRadius: '10px',
        boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', padding: '6px', gap: '4px', alignItems: 'center',
      }}>
        {[
          { action: handleUndo, icon: Undo, label: 'Undo (⌘Z)', enabled: historyIndex > 0 },
          { action: handleRedo, icon: Redo, label: 'Redo (⌘⇧Z)', enabled: historyIndex < historyLength - 1 },
        ].map(({ action, icon, label, enabled }) => (
          <ToolButton
            key={label}
            isActive={false}
            onClick={enabled ? action : undefined}
            title={label}
            icon={icon}
            theme={theme}
            color={enabled ? theme.text : (darkMode ? '#3a4a6c' : '#ccc')}
          />
        ))}
      </div>
      <style>{`
        .toolbar-scroll::-webkit-scrollbar { display: none; }
        @keyframes tooltipFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
})
