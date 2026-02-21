import { useEffect, useRef, useState } from 'react';
import { Copy, Clipboard, Scissors, CopyPlus, Trash2, ArrowUpToLine, ArrowUp, ArrowDown, ArrowDownToLine, Pencil } from 'lucide-react';

export default function ContextMenu({ x, y, hasObject, hasClipboard, onClose, onEdit, onCopy, onPaste, onCut, onDuplicate, onDelete, onBringToFront, onBringForward, onSendBackward, onSendToBack }) {
  const ref = useRef(null);
  const [showReorder, setShowReorder] = useState(false);

  // Close on click outside or scroll
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const closeScroll = () => onClose();
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', closeScroll, true);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('scroll', closeScroll, true); };
  }, [onClose]);

  // Keep menu in viewport
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const nx = x + rect.width > window.innerWidth ? x - rect.width : x;
      const ny = y + rect.height > window.innerHeight ? y - rect.height : y;
      setPos({ x: Math.max(0, nx), y: Math.max(0, ny) });
    }
  }, [x, y]);

  const menuStyle = {
    position: 'fixed', left: pos.x, top: pos.y, zIndex: 99999,
    background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
    padding: '6px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: '#e0e0e0',
  };

  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
    cursor: 'pointer', transition: 'background 0.15s',
  };

  const shortcutStyle = { marginLeft: 'auto', fontSize: 11, color: '#888', fontFamily: 'monospace' };
  const sepStyle = { height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' };
  const iconSize = 15;

  const Item = ({ icon: Icon, label, shortcut, onClick, danger }) => (
    <div
      style={{ ...itemStyle, color: danger ? '#FF5252' : '#e0e0e0' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      onClick={(e) => { e.stopPropagation(); onClick(); onClose(); }}
    >
      {Icon && <Icon size={iconSize} />}
      <span>{label}</span>
      {shortcut && <span style={shortcutStyle}>{shortcut}</span>}
    </div>
  );

  const reorderMenuStyle = {
    position: 'absolute', left: '100%', top: 0, marginLeft: 4,
    background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
    padding: '6px 0', minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  };

  // Canvas right-click (no object) — only show Paste
  if (!hasObject) {
    return (
      <div ref={ref} style={menuStyle}>
        {hasClipboard ? (
          <Item icon={Clipboard} label="Paste" shortcut="⌘V" onClick={onPaste} />
        ) : (
          <div style={{ ...itemStyle, color: '#555', cursor: 'default' }}>
            <Clipboard size={iconSize} />
            <span>Paste</span>
            <span style={shortcutStyle}>⌘V</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} style={menuStyle}>
      <Item icon={Pencil} label="Edit" onClick={onEdit} />

      {/* Reorder submenu */}
      <div
        style={{ ...itemStyle, position: 'relative' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; setShowReorder(true); }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; setShowReorder(false); }}
      >
        <ArrowUpToLine size={iconSize} />
        <span>Reorder</span>
        <span style={shortcutStyle}>▸</span>
        {showReorder && (
          <div style={reorderMenuStyle}>
            <Item icon={ArrowUpToLine} label="Bring to Front" onClick={onBringToFront} />
            <Item icon={ArrowUp} label="Bring Forward" onClick={onBringForward} />
            <Item icon={ArrowDown} label="Send Backward" onClick={onSendBackward} />
            <Item icon={ArrowDownToLine} label="Send to Back" onClick={onSendToBack} />
          </div>
        )}
      </div>

      <div style={sepStyle} />

      <Item icon={Scissors} label="Cut" shortcut="⌘X" onClick={onCut} />
      <Item icon={Copy} label="Copy" shortcut="⌘C" onClick={onCopy} />
      {hasClipboard ? (
        <Item icon={Clipboard} label="Paste" shortcut="⌘V" onClick={onPaste} />
      ) : (
        <div style={{ ...itemStyle, color: '#555', cursor: 'default' }}>
          <Clipboard size={iconSize} />
          <span>Paste</span>
          <span style={shortcutStyle}>⌘V</span>
        </div>
      )}
      <Item icon={CopyPlus} label="Duplicate" shortcut="⌘D" onClick={onDuplicate} />

      <div style={sepStyle} />

      <Item icon={Trash2} label="Delete" shortcut="⌫" onClick={onDelete} danger />
    </div>
  );
}
