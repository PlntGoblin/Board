import { memo, useState as useLocalState, useRef, useEffect } from 'react';
import { Bold, AlignLeft, AlignCenter, RotateCw, MessageSquare, Minus, Reply, Trash2, X } from 'lucide-react';
import { getColor, STICKY_COLORS, FONT_SIZES, SHAPE_COLORS, STROKE_SIZES, TEXT_COLORS, DRAW_COLORS } from '../../lib/theme';
import { computeCurvedConnectorPath } from '../../lib/geometry';

export default memo(function BoardObject({
  obj, isSelected, isEditing, editingText,
  setEditingId, setEditingText,
  handleMouseDown, setBoardObjects,
  setIsResizing, setResizeHandle, setIsRotating, isMultiSelected, theme, user,
  onContextMenu,
}) {
  const updateProp = (id, prop, value) => {
    setBoardObjects(prev => prev.map(o => o.id === id ? { ...o, [prop]: value } : o));
  };

  if (obj.type === 'stickyNote') {
    return <StickyNote
      obj={obj} isSelected={isSelected} isEditing={isEditing}
      editingText={editingText} setEditingId={setEditingId}
      setEditingText={setEditingText} handleMouseDown={handleMouseDown}
      setBoardObjects={setBoardObjects} updateProp={updateProp}
      setIsResizing={setIsResizing} setResizeHandle={setResizeHandle}
      setIsRotating={setIsRotating} isMultiSelected={isMultiSelected}
      onContextMenu={onContextMenu}
    />;
  }

  if (obj.type === 'shape') {
    return <Shape
      obj={obj} isSelected={isSelected} isEditing={isEditing}
      editingText={editingText} setEditingId={setEditingId}
      setEditingText={setEditingText} setBoardObjects={setBoardObjects}
      handleMouseDown={handleMouseDown} updateProp={updateProp}
      setIsResizing={setIsResizing} setResizeHandle={setResizeHandle}
      setIsRotating={setIsRotating} isMultiSelected={isMultiSelected}
      onContextMenu={onContextMenu}
    />;
  }

  if (obj.type === 'text') {
    return <TextObject
      obj={obj} isSelected={isSelected} isEditing={isEditing}
      editingText={editingText} setEditingId={setEditingId}
      setEditingText={setEditingText} handleMouseDown={handleMouseDown}
      setBoardObjects={setBoardObjects} updateProp={updateProp} theme={theme}
      setIsRotating={setIsRotating} isMultiSelected={isMultiSelected}
      onContextMenu={onContextMenu}
    />;
  }

  if (obj.type === 'frame') {
    return <Frame obj={obj} isSelected={isSelected} isEditing={isEditing} editingText={editingText} setEditingId={setEditingId} setEditingText={setEditingText} setBoardObjects={setBoardObjects} handleMouseDown={handleMouseDown} theme={theme} setIsResizing={setIsResizing} setResizeHandle={setResizeHandle} setIsRotating={setIsRotating} isMultiSelected={isMultiSelected} onContextMenu={onContextMenu} />;
  }

  if (obj.type === 'comment') {
    return <Comment
      obj={obj} isSelected={isSelected} isEditing={isEditing}
      editingText={editingText} setEditingId={setEditingId}
      setEditingText={setEditingText} handleMouseDown={handleMouseDown}
      setBoardObjects={setBoardObjects} theme={theme}
      isMultiSelected={isMultiSelected} user={user}
      onContextMenu={onContextMenu}
    />;
  }

  if (obj.type === 'emoji') {
    return <EmojiSticker obj={obj} isSelected={isSelected} handleMouseDown={handleMouseDown} setIsResizing={setIsResizing} setResizeHandle={setResizeHandle} setIsRotating={setIsRotating} isMultiSelected={isMultiSelected} onContextMenu={onContextMenu} />;
  }

  if (obj.type === 'path') return <PathDrawing obj={obj} isSelected={isSelected} handleMouseDown={handleMouseDown} updateProp={updateProp} isMultiSelected={isMultiSelected} onContextMenu={onContextMenu} />;
  if (obj.type === 'line') return <LineDrawing obj={obj} isSelected={isSelected} handleMouseDown={handleMouseDown} updateProp={updateProp} isMultiSelected={isMultiSelected} onContextMenu={onContextMenu} setBoardObjects={setBoardObjects} />;
  if (obj.type === 'arrow') return <ArrowDrawing obj={obj} isSelected={isSelected} handleMouseDown={handleMouseDown} updateProp={updateProp} isMultiSelected={isMultiSelected} onContextMenu={onContextMenu} setBoardObjects={setBoardObjects} />;
  if (obj.type === 'connector') return <ConnectorObject obj={obj} isSelected={isSelected} handleMouseDown={handleMouseDown} updateProp={updateProp} isMultiSelected={isMultiSelected} onContextMenu={onContextMenu} />;

  return null;
}, (prev, next) =>
  prev.obj === next.obj &&
  prev.isSelected === next.isSelected &&
  prev.isEditing === next.isEditing &&
  prev.editingText === next.editingText &&
  prev.theme === next.theme &&
  prev.isMultiSelected === next.isMultiSelected
)

function StickyNote({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, handleMouseDown, setBoardObjects, updateProp, setIsResizing, setResizeHandle, setIsRotating, isMultiSelected, onContextMenu }) {
  const noteFontSize = obj.fontSize || 14;
  const noteAlign = obj.textAlign || 'left';
  const showToolbar = (isSelected || isEditing) && !isMultiSelected;
  const editRef = useRef(null);

  // Focus contentEditable when entering edit mode
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      // Place cursor at end
      const sel = window.getSelection();
      sel.selectAllChildren(editRef.current);
      sel.collapseToEnd();
    }
  }, [isEditing]);

  const saveContent = () => {
    if (editRef.current) {
      const html = editRef.current.innerHTML;
      setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: html } : o));
    }
    setEditingId(null);
  };

  const applyCommand = (cmd, value) => {
    editRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  // Update a prop while preserving current contentEditable formatting
  const syncProp = (prop, value) => {
    if (isEditing && editRef.current) {
      const html = editRef.current.innerHTML;
      setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: html, [prop]: value } : o));
    } else {
      updateProp(obj.id, prop, value);
    }
  };

  return (
    <div key={obj.id} style={{ position: 'absolute', left: obj.x, top: obj.y, transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined, transformOrigin: 'center center' }}>
      {isSelected && !isEditing && !isMultiSelected && <RotationHandle setIsRotating={setIsRotating} />}
      {showToolbar && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '2px',
            background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
            padding: '4px 6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap', zIndex: 100,
          }}
        >
          {FONT_SIZES.map(fs => (
            <button
              key={fs.label}
              onClick={() => {
                if (isEditing) { applyCommand('fontSize', '7'); const els = editRef.current?.querySelectorAll('font[size="7"]'); els?.forEach(el => { el.removeAttribute('size'); el.style.fontSize = `${fs.value}px`; }); }
                else syncProp('fontSize', fs.value);
              }}
              style={{
                width: '26px', height: '26px', border: 'none', borderRadius: '6px',
                background: noteFontSize === fs.value ? 'rgba(56,189,248,0.2)' : 'transparent',
                color: noteFontSize === fs.value ? '#38bdf8' : '#94a3b8',
                fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title={`Font size ${fs.label}`}
            >
              {fs.label}
            </button>
          ))}
          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button
            onClick={() => {
              if (isEditing) applyCommand('bold');
              else syncProp('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
            }}
            style={{
              width: '26px', height: '26px', border: 'none', borderRadius: '6px',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Bold"
          >
            <Bold size={13} />
          </button>
          {['left', 'center'].map(align => (
            <button
              key={align}
              onClick={() => syncProp('textAlign', align)}
              style={{
                width: '26px', height: '26px', border: 'none', borderRadius: '6px',
                background: noteAlign === align ? 'rgba(56,189,248,0.2)' : 'transparent',
                color: noteAlign === align ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title={`Align ${align}`}
            >
              {align === 'left' ? <AlignLeft size={13} /> : <AlignCenter size={13} />}
            </button>
          ))}
          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {STICKY_COLORS.map(c => (
            <button
              key={c}
              onClick={() => syncProp('color', c)}
              style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: obj.color === c ? '2px solid #fff' : '2px solid transparent',
                background: getColor(c), cursor: 'pointer', padding: 0,
                boxShadow: obj.color === c ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
              title={c}
            />
          ))}
        </div>
      )}

      <div
        onMouseDown={(e) => { if (!isEditing) handleMouseDown(e, obj.id); }}
        onContextMenu={(e) => onContextMenu?.(e, obj.id)}
        style={{
          width: obj.width, height: obj.height,
          backgroundColor: getColor(obj.color),
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '2px 2px 4px 4px',
          cursor: isEditing ? 'default' : 'move',
          boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 4px 6px rgba(0,0,0,0.06), 0 10px 14px -4px rgba(0,0,0,0.1), 2px 12px 16px -2px rgba(0,0,0,0.08)',
          fontSize: `${noteFontSize}px`, fontWeight: obj.fontWeight || 'normal',
          textAlign: noteAlign, overflow: 'hidden',
          userSelect: isEditing ? 'text' : 'none', boxSizing: 'border-box',
          position: 'relative', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 100%)',
          borderRadius: '2px 2px 0 0', pointerEvents: 'none', zIndex: 1,
        }} />
        {/* Text editing zone — top area */}
        <div
          onMouseDown={(e) => { if (isEditing) e.stopPropagation(); }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!isEditing) { setEditingId(obj.id); setEditingText(obj.text); }
          }}
          style={{
            padding: '16px 16px 8px 16px', cursor: isEditing ? 'text' : 'move',
            flexShrink: 0, minHeight: `${noteFontSize + 16}px`,
          }}
        >
          {isEditing ? (
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={saveContent}
              onKeyDown={(e) => { if (e.key === 'Escape') saveContent(); }}
              dangerouslySetInnerHTML={{ __html: obj.text || '' }}
              style={{
                width: '100%', minHeight: Math.max(40, Math.floor((obj.height || 200) * 0.35)) + 'px',
                border: 'none', outline: 'none',
                background: 'transparent', fontSize: 'inherit', fontWeight: 'inherit',
                textAlign: 'inherit', fontFamily: 'inherit', color: 'inherit',
                overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}
            />
          ) : (
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: obj.text || '' }} />
          )}
        </div>
        {/* Drag zone — rest of the note body */}
        {isEditing && (
          <div
            onMouseDown={(e) => { handleMouseDown(e, obj.id); }}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{ flex: 1, cursor: 'move', minHeight: '20px' }}
          />
        )}
      </div>
      {isSelected && !isMultiSelected && (
        <SelectionOutline obj={obj} setIsResizing={setIsResizing} setResizeHandle={setResizeHandle} />
      )}
    </div>
  );
}

// Auto-contrast: pick white or dark text based on fill luminance
function autoTextColor(fillHex) {
  if (!fillHex || fillHex === 'transparent') return '#ffffff';
  const hex = fillHex.replace('#', '');
  if (hex.length < 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a2e' : '#ffffff';
}

function Shape({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, setBoardObjects, handleMouseDown, updateProp, setIsResizing, setResizeHandle, setIsRotating, isMultiSelected, onContextMenu }) {
  const w = obj.width || 100;
  const h = obj.height || 100;
  const fillColor = getColor(obj.color);
  const userStrokeW = obj.strokeWidth ?? 2;
  const strokeColor = obj.strokeColor || 'rgba(0,0,0,0.3)';
  const strokeW = userStrokeW;
  const shapeFontSize = obj.fontSize || 14;
  const shapeBold = obj.fontWeight === 'bold';
  const shapeTextColor = obj.textColor || autoTextColor(fillColor);
  const showToolbar = (isSelected || isEditing) && !isMultiSelected;
  const [showTextColorPicker, setShowTextColorPicker] = useLocalState(false);
  const [showFillColorPicker, setShowFillColorPicker] = useLocalState(false);
  const shapeEditRef = useRef(null);

  useEffect(() => {
    if (isEditing && shapeEditRef.current) {
      shapeEditRef.current.focus();
      const sel = window.getSelection();
      sel.selectAllChildren(shapeEditRef.current);
      sel.collapseToEnd();
    }
  }, [isEditing]);

  const saveShapeContent = () => {
    if (shapeEditRef.current) {
      const html = shapeEditRef.current.innerHTML;
      setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: html } : o));
    }
    setEditingId(null);
  };

  const applyShapeCommand = (cmd, value) => {
    shapeEditRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const syncShapeProp = (prop, value) => {
    if (isEditing && shapeEditRef.current) {
      const html = shapeEditRef.current.innerHTML;
      setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: html, [prop]: value } : o));
    } else {
      updateProp(obj.id, prop, value);
    }
  };

  const getShapePath = () => {
    switch (obj.shapeType) {
      case 'circle':
        return <ellipse cx={w/2} cy={h/2} rx={w/2 - 2} ry={h/2 - 2} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} />;
      case 'triangle':
        return <polygon points={`${w/2},2 ${w-2},${h-2} 2,${h-2}`} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 'diamond':
        return <polygon points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />;
      case 'hexagon': {
        const cx = w/2, cy = h/2, rx = w/2 - 2, ry = h/2 - 2;
        const pts = Array.from({length: 6}, (_, i) => {
          const a = Math.PI / 3 * i - Math.PI / 2;
          return `${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`;
        }).join(' ');
        return <polygon points={pts} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />;
      }
      case 'star': {
        const cx = w/2, cy = h/2, outer = Math.min(w, h)/2 - 2, inner = outer * 0.4;
        const pts = Array.from({length: 10}, (_, i) => {
          const a = Math.PI / 5 * i - Math.PI / 2;
          const r = i % 2 === 0 ? outer : inner;
          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        }).join(' ');
        return <polygon points={pts} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />;
      }
      default:
        return <rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} />;
    }
  };

  return (
    <div key={obj.id} style={{ position: 'absolute', left: obj.x, top: obj.y, width: w, height: h, transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined, transformOrigin: 'center center' }}>
      {isSelected && !isMultiSelected && <RotationHandle setIsRotating={setIsRotating} />}
      {showToolbar && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '2px',
            background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
            padding: '4px 6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap', zIndex: 100,
          }}
        >
          {/* Fill color & opacity button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowFillColorPicker(p => !p); setShowTextColorPicker(false); }}
              style={{
                width: '28px', height: '28px', border: 'none', borderRadius: '6px',
                background: showFillColorPicker ? 'rgba(56,189,248,0.2)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', padding: 0,
              }}
              title="Set color and opacity"
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '4px',
                background: fillColor, border: '1.5px solid rgba(255,255,255,0.3)',
                opacity: obj.opacity ?? 1,
              }} />
            </button>
            {showFillColorPicker && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginBottom: '6px', padding: '8px',
                  background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 110,
                  display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  {SHAPE_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => { syncShapeProp('color', c.name); setShowFillColorPicker(false); }}
                      style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: obj.color === c.name ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.2)',
                        background: c.hex, cursor: 'pointer', padding: 0,
                        boxShadow: obj.color === c.name ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                        transition: 'all 0.15s',
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
                {/* Opacity slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Opacity</span>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={obj.opacity ?? 1}
                    onChange={(e) => syncShapeProp('opacity', parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: '#4a90d9', height: '4px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '10px', color: '#c4d0ff', width: '28px', textAlign: 'right' }}>
                    {Math.round((obj.opacity ?? 1) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {/* Border stroke sizes */}
          {STROKE_SIZES.map(s => (
            <button
              key={s.value}
              onClick={() => syncShapeProp('strokeWidth', s.value)}
              style={{
                width: '26px', height: '26px', border: 'none', borderRadius: '6px',
                background: userStrokeW === s.value ? 'rgba(56,189,248,0.2)' : 'transparent',
                color: userStrokeW === s.value ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', padding: 0,
              }}
              title={`Stroke ${s.value}px`}
            >
              <div style={{
                width: '14px', height: `${Math.max(s.value, 1)}px`,
                background: userStrokeW === s.value ? '#38bdf8' : '#94a3b8',
                borderRadius: '1px',
              }} />
            </button>
          ))}
          {/* Text controls — always visible */}
          <>
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            {FONT_SIZES.map(fs => (
              <button
                key={fs.label}
                onClick={() => {
                  if (isEditing) { applyShapeCommand('fontSize', '7'); const els = shapeEditRef.current?.querySelectorAll('font[size="7"]'); els?.forEach(el => { el.removeAttribute('size'); el.style.fontSize = `${fs.value}px`; }); }
                  else syncShapeProp('fontSize', fs.value);
                }}
                style={{
                  width: '26px', height: '26px', border: 'none', borderRadius: '6px',
                  background: shapeFontSize === fs.value ? 'rgba(56,189,248,0.2)' : 'transparent',
                  color: shapeFontSize === fs.value ? '#38bdf8' : '#94a3b8',
                  fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                title={`Font ${fs.label}`}
              >
                {fs.label}
              </button>
            ))}
            <button
              onClick={() => {
                if (isEditing) applyShapeCommand('bold');
                else syncShapeProp('fontWeight', shapeBold ? 'normal' : 'bold');
              }}
              style={{
                width: '26px', height: '26px', border: 'none', borderRadius: '6px',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title="Bold"
              >
                <Bold size={13} />
              </button>
              <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              {/* Text color: A with underline */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTextColorPicker(p => !p)}
                  style={{
                    width: '28px', height: '28px', border: 'none', borderRadius: '6px',
                    background: showTextColorPicker ? 'rgba(56,189,248,0.2)' : 'transparent',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '1px',
                    transition: 'all 0.15s', padding: 0,
                  }}
                  title="Text color"
                >
                  <span style={{ fontSize: '14px', fontWeight: '700', color: shapeTextColor, lineHeight: 1, textShadow: '0 0 3px rgba(255,255,255,0.6), 0 0 1px rgba(255,255,255,0.8)' }}>A</span>
                  <div style={{ width: '14px', height: '3px', borderRadius: '1px', background: shapeTextColor, boxShadow: '0 0 2px rgba(255,255,255,0.5)' }} />
                </button>
                {showTextColorPicker && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                    marginBottom: '6px', display: 'flex', gap: '4px', padding: '6px 8px',
                    background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 110,
                  }}>
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => { syncShapeProp('textColor', c.hex); setShowTextColorPicker(false); }}
                        style={{
                          width: '18px', height: '18px', borderRadius: '50%',
                          border: shapeTextColor === c.hex ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.2)',
                          background: c.hex, cursor: 'pointer', padding: 0,
                          transition: 'all 0.15s',
                        }}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>
          </>
        </div>
      )}

      {/* Shape SVG */}
      <svg
        width={w} height={h}
        onMouseDown={(e) => { if (!isEditing) handleMouseDown(e, obj.id); }}
        onContextMenu={(e) => onContextMenu?.(e, obj.id)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isEditing) { setEditingId(obj.id); setEditingText(obj.text || ''); }
        }}
        style={{ cursor: isEditing ? 'text' : 'move', display: 'block', position: 'absolute', top: 0, left: 0, opacity: obj.opacity ?? 1 }}
      >
        {getShapePath()}
      </svg>

      {/* Text layer on top of shape */}
      <div
        onMouseDown={(e) => { if (isEditing) e.stopPropagation(); }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isEditing) { setEditingId(obj.id); setEditingText(obj.text || ''); }
        }}
        style={{
          position: 'absolute', top: 0, left: 0, width: w, height: h,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: obj.shapeType === 'triangle' ? '30% 15% 10%' : obj.shapeType === 'diamond' ? '20%' : '12px',
          boxSizing: 'border-box', pointerEvents: isEditing ? 'auto' : 'none',
          overflow: 'hidden',
        }}
      >
        {isEditing ? (
          <div
            ref={shapeEditRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={saveShapeContent}
            onKeyDown={(e) => { if (e.key === 'Escape') saveShapeContent(); }}
            dangerouslySetInnerHTML={{ __html: obj.text || '' }}
            style={{
              width: '100%', border: 'none', outline: 'none',
              background: 'transparent', textAlign: 'center',
              fontSize: `${shapeFontSize}px`, fontWeight: obj.fontWeight || 'normal',
              color: shapeTextColor, fontFamily: 'system-ui, sans-serif',
              overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          />
        ) : obj.text ? (
          <span style={{
            fontSize: `${shapeFontSize}px`, fontWeight: obj.fontWeight || 'normal',
            color: shapeTextColor, textAlign: 'center',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            lineHeight: '1.3', userSelect: 'none',
          }} dangerouslySetInnerHTML={{ __html: obj.text }} />
        ) : null}
      </div>

      {isSelected && !isMultiSelected && (
        <SelectionOutline obj={obj} setIsResizing={setIsResizing} setResizeHandle={setResizeHandle} />
      )}
    </div>
  );
}

function TextObject({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, handleMouseDown, setBoardObjects, updateProp, theme, setIsRotating, isMultiSelected, onContextMenu }) {
  const textFontSize = obj.fontSize || 16;
  const textAlign = obj.textAlign || 'left';
  const textColor = obj.color || theme.text;
  const showToolbar = (isSelected || isEditing) && !isMultiSelected;
  const [showColorPicker, setShowColorPicker] = useLocalState(false);
  const textEditRef = useRef(null);

  useEffect(() => {
    if (isEditing && textEditRef.current) {
      textEditRef.current.focus();
      const sel = window.getSelection();
      sel.selectAllChildren(textEditRef.current);
      sel.collapseToEnd();
    }
  }, [isEditing]);

  const saveTextContent = () => {
    if (textEditRef.current) {
      const html = textEditRef.current.innerHTML;
      setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: html } : o));
    }
    setEditingId(null);
  };

  const applyTextCommand = (cmd, value) => {
    textEditRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const syncTextProp = (prop, value) => {
    if (isEditing && textEditRef.current) {
      const html = textEditRef.current.innerHTML;
      setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: html, [prop]: value } : o));
    } else {
      updateProp(obj.id, prop, value);
    }
  };

  return (
    <div key={obj.id} style={{ position: 'absolute', left: obj.x, top: obj.y, transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined, transformOrigin: 'center center' }}>
      {isSelected && !isEditing && !isMultiSelected && <RotationHandle setIsRotating={setIsRotating} />}
      {showToolbar && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '2px',
            background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
            padding: '4px 6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap', zIndex: 100,
          }}
        >
          {FONT_SIZES.map(fs => (
            <button
              key={fs.label}
              onClick={() => {
                if (isEditing) { applyTextCommand('fontSize', '7'); const els = textEditRef.current?.querySelectorAll('font[size="7"]'); els?.forEach(el => { el.removeAttribute('size'); el.style.fontSize = `${fs.value}px`; }); }
                else syncTextProp('fontSize', fs.value);
              }}
              style={{
                width: '26px', height: '26px', border: 'none', borderRadius: '6px',
                background: textFontSize === fs.value ? 'rgba(56,189,248,0.2)' : 'transparent',
                color: textFontSize === fs.value ? '#38bdf8' : '#94a3b8',
                fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title={`Font size ${fs.label}`}
            >
              {fs.label}
            </button>
          ))}
          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button
            onClick={() => {
              if (isEditing) applyTextCommand('bold');
              else syncTextProp('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
            }}
            style={{
              width: '26px', height: '26px', border: 'none', borderRadius: '6px',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Bold"
          >
            <Bold size={13} />
          </button>
          {['left', 'center'].map(align => (
            <button
              key={align}
              onClick={() => syncTextProp('textAlign', align)}
              style={{
                width: '26px', height: '26px', border: 'none', borderRadius: '6px',
                background: textAlign === align ? 'rgba(56,189,248,0.2)' : 'transparent',
                color: textAlign === align ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              title={`Align ${align}`}
            >
              {align === 'left' ? <AlignLeft size={13} /> : <AlignCenter size={13} />}
            </button>
          ))}
          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {/* Text color: A with underline */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColorPicker(p => !p)}
              style={{
                width: '28px', height: '28px', border: 'none', borderRadius: '6px',
                background: showColorPicker ? 'rgba(56,189,248,0.2)' : 'transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '1px',
                transition: 'all 0.15s', padding: 0,
              }}
              title="Set font color"
            >
              <span style={{ fontSize: '14px', fontWeight: '700', color: textColor, lineHeight: 1, textShadow: '0 0 3px rgba(255,255,255,0.6), 0 0 1px rgba(255,255,255,0.8)' }}>A</span>
              <div style={{ width: '14px', height: '3px', borderRadius: '1px', background: textColor, boxShadow: '0 0 2px rgba(255,255,255,0.5)' }} />
            </button>
            {showColorPicker && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginBottom: '6px', display: 'flex', gap: '4px', padding: '6px 8px',
                  background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 110,
                }}>
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => { syncTextProp('color', c.hex); setShowColorPicker(false); }}
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: textColor === c.hex ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.2)',
                      background: c.hex, cursor: 'pointer', padding: 0,
                      transition: 'all 0.15s',
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        onMouseDown={(e) => { if (!isEditing) handleMouseDown(e, obj.id); }}
        onContextMenu={(e) => onContextMenu?.(e, obj.id)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isEditing) { setEditingId(obj.id); setEditingText(obj.text); }
        }}
        style={{
          width: isEditing ? (obj.width || undefined) : (obj.width ? obj.width : 'fit-content'),
          minWidth: isEditing ? '200px' : '20px',
          padding: '8px', position: 'relative',
          border: '2px solid transparent',
          borderRadius: '4px', cursor: isEditing ? 'text' : 'move',
          fontSize: `${textFontSize}px`, fontFamily: 'system-ui, sans-serif',
          fontWeight: obj.fontWeight || 'normal', textAlign: textAlign,
          color: textColor, userSelect: isEditing ? 'text' : 'none',
          whiteSpace: 'pre-wrap', boxSizing: 'border-box',
        }}
      >
        {isEditing ? (
          <div
            ref={textEditRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={saveTextContent}
            onKeyDown={(e) => { if (e.key === 'Escape') saveTextContent(); }}
            dangerouslySetInnerHTML={{ __html: obj.text || '' }}
            style={{
              width: '100%', minHeight: '24px', border: 'none', outline: 'none',
              background: 'transparent', fontSize: 'inherit', fontWeight: 'inherit',
              textAlign: 'inherit', fontFamily: 'inherit',
              color: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          />
        ) : (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: obj.text || '' }} />
        )}
      </div>
    </div>
  );
}

function Frame({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, setBoardObjects, handleMouseDown, theme, setIsResizing, setResizeHandle, setIsRotating, isMultiSelected, onContextMenu }) {
  return (
    <div
      key={obj.id}
      onMouseDown={(e) => { if (!isEditing) handleMouseDown(e, obj.id); }}
      onContextMenu={(e) => onContextMenu?.(e, obj.id)}
      style={{
        position: 'absolute', left: obj.x, top: obj.y,
        width: obj.width, height: obj.height,
        border: `2px dashed ${theme.textSecondary}`,
        borderRadius: '8px', cursor: isEditing ? 'default' : 'move',
        backgroundColor: 'rgba(255,255,255,0.05)',
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
    >
      {isSelected && !isMultiSelected && <RotationHandle setIsRotating={setIsRotating} />}
      <div
        onMouseDown={(e) => {
          if (isSelected) e.stopPropagation();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isEditing) { setEditingId(obj.id); setEditingText(obj.title || ''); }
        }}
        style={{
          position: 'absolute', top: -30, left: 0,
          padding: '4px 12px', backgroundColor: '#333',
          color: 'white', borderRadius: '4px',
          fontSize: '14px', fontWeight: 'bold',
          cursor: isEditing ? 'text' : 'pointer',
          minWidth: '60px',
        }}
      >
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => {
              setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, title: editingText } : o));
              setEditingId(null);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.target.blur(); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              color: 'white', fontSize: '14px', fontWeight: 'bold',
              fontFamily: 'inherit', width: '100%', padding: 0,
            }}
          />
        ) : (
          obj.title
        )}
      </div>
      {isSelected && !isMultiSelected && (
        <SelectionOutline obj={obj} setIsResizing={setIsResizing} setResizeHandle={setResizeHandle} />
      )}
    </div>
  );
}

const SVG_STYLE_INTERACTIVE = {
  position: 'absolute', top: 0, left: 0,
  width: '5000px', height: '5000px',
  overflow: 'visible',
  pointerEvents: 'none',
};

function DrawingColorToolbar({ obj, midX, midY, updateProp }) {
  const [showColorPicker, setShowColorPicker] = useLocalState(false);
  const color = obj.color || '#ffffff';
  const sw = obj.strokeWidth || 3;
  return (
    <div
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
      style={{
        position: 'absolute', left: midX, top: midY - 60,
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '4px',
        background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
        padding: '4px 6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'auto',
      }}
    >
      {/* Color & opacity button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowColorPicker(p => !p)}
          style={{
            width: '28px', height: '28px', border: 'none', borderRadius: '6px',
            background: showColorPicker ? 'rgba(56,189,248,0.2)' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', padding: 0,
          }}
          title="Set color and opacity"
        >
          <div style={{
            width: '18px', height: '18px', borderRadius: '4px',
            background: color, border: '1.5px solid rgba(255,255,255,0.3)',
            opacity: obj.opacity ?? 1,
          }} />
        </button>
        {showColorPicker && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              marginBottom: '6px', padding: '8px',
              background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 110,
              display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '160px' }}>
              {DRAW_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { updateProp(obj.id, 'color', c); setShowColorPicker(false); }}
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    border: color === c ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.2)',
                    background: c, cursor: 'pointer', padding: 0,
                    boxShadow: color === c ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
            {/* Opacity slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Opacity</span>
              <input
                type="range" min="0" max="1" step="0.05"
                value={obj.opacity ?? 1}
                onChange={(e) => updateProp(obj.id, 'opacity', parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#4a90d9', height: '4px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '10px', color: '#c4d0ff', width: '28px', textAlign: 'right' }}>
                {Math.round((obj.opacity ?? 1) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
      <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />
      {/* Thickness options */}
      {STROKE_SIZES.map(s => (
        <button
          key={s.value}
          onClick={() => updateProp(obj.id, 'strokeWidth', s.value)}
          style={{
            width: '26px', height: '26px', border: 'none', borderRadius: '6px',
            background: sw === s.value ? 'rgba(56,189,248,0.2)' : 'transparent',
            color: sw === s.value ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', padding: 0,
          }}
          title={`Thickness ${s.value}px`}
        >
          <div style={{
            width: '14px', height: `${Math.max(s.value, 1)}px`,
            background: sw === s.value ? '#38bdf8' : '#94a3b8',
            borderRadius: '1px',
          }} />
        </button>
      ))}
    </div>
  );
}

function PathDrawing({ obj, isSelected, handleMouseDown, updateProp, isMultiSelected, onContextMenu }) {
  if (obj.points.length < 2) return null;
  const d = obj.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const mid = obj.points[Math.floor(obj.points.length / 2)];
  return (
    <>
      <svg key={obj.id} style={SVG_STYLE_INTERACTIVE}>
        <path d={d} stroke="transparent" strokeWidth={Math.max(obj.strokeWidth || 3, 30)} fill="none"
          strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)} onContextMenu={(e) => onContextMenu?.(e, obj.id)} />
        <path d={d} stroke={obj.color} strokeWidth={obj.strokeWidth} fill="none"
          strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" opacity={obj.opacity ?? 1} />
      </svg>
      {isSelected && !isMultiSelected && <DrawingColorToolbar obj={obj} midX={mid.x} midY={mid.y} updateProp={updateProp} />}
    </>
  );
}

// Convert screen (clientX/Y) to SVG coordinates using the SVG's own transform matrix
function screenToSVG(svg, clientX, clientY) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = new DOMPoint(clientX, clientY);
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

// Endpoint handle — grab one end, the opposite stays anchored, this end follows the cursor
function EndpointHandle({ x, y, obj, setBoardObjects, endpoint }) {
  const startDrag = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const objId = obj.id;
    const onMove = (ev) => {
      const pt = screenToSVG(svg, ev.clientX, ev.clientY);
      if (!pt) return;
      setBoardObjects(prev => prev.map(o => {
        if (o.id !== objId) return o;
        if (endpoint === 'start') return { ...o, x1: pt.x, y1: pt.y };
        return { ...o, x2: pt.x, y2: pt.y };
      }));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  return (
    <circle cx={x} cy={y} r={5} fill="white" stroke="#2196F3" strokeWidth={2}
      style={{ cursor: 'grab', pointerEvents: 'auto' }} onMouseDown={startDrag} />
  );
}

// Bend handle — dragging bends the line. The handle shows ON the curve (t=0.5),
// and we reverse-compute the control point: CP = 2*curvePoint - 0.5*P0 - 0.5*P1
function BendHandle({ x, y, obj, setBoardObjects }) {
  const startDrag = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const objId = obj.id;
    const onMove = (ev) => {
      const pt = screenToSVG(svg, ev.clientX, ev.clientY);
      if (!pt) return;
      // pt is where the user wants the curve to pass through (at t=0.5)
      // Reverse-solve for the quadratic bezier control point
      setBoardObjects(prev => prev.map(o => {
        if (o.id !== objId) return o;
        const cpx = 2 * pt.x - 0.5 * o.x1 - 0.5 * o.x2;
        const cpy = 2 * pt.y - 0.5 * o.y1 - 0.5 * o.y2;
        return { ...o, cx: cpx, cy: cpy };
      }));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  return (
    <circle cx={x} cy={y} r={6} fill="#e3f2fd" stroke="#2196F3" strokeWidth={2}
      style={{ cursor: 'grab', pointerEvents: 'auto' }} onMouseDown={startDrag} />
  );
}

function LineDrawing({ obj, isSelected, handleMouseDown, updateProp, isMultiSelected, onContextMenu, setBoardObjects }) {
  const midX = (obj.x1 + obj.x2) / 2;
  const midY = (obj.y1 + obj.y2) / 2;
  const hasBend = obj.cx != null;
  const pathD = hasBend ? `M ${obj.x1} ${obj.y1} Q ${obj.cx} ${obj.cy} ${obj.x2} ${obj.y2}` : `M ${obj.x1} ${obj.y1} L ${obj.x2} ${obj.y2}`;
  // BendHandle position: point ON the curve at t=0.5 (not the control point)
  const handleX = hasBend ? 0.25 * obj.x1 + 0.5 * obj.cx + 0.25 * obj.x2 : midX;
  const handleY = hasBend ? 0.25 * obj.y1 + 0.5 * obj.cy + 0.25 * obj.y2 : midY;
  return (
    <>
      <svg key={obj.id} style={SVG_STYLE_INTERACTIVE}>
        <path d={pathD}
          stroke="transparent" strokeWidth={Math.max(obj.strokeWidth || 3, 30)} fill="none"
          strokeLinecap="round" style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)} onContextMenu={(e) => onContextMenu?.(e, obj.id)} />
        <path d={pathD}
          stroke={obj.color} strokeWidth={obj.strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={obj.strokeDasharray || 'none'} pointerEvents="none" opacity={obj.opacity ?? 1} />
        {isSelected && !isMultiSelected && (
          <>
            <EndpointHandle x={obj.x1} y={obj.y1} obj={obj} setBoardObjects={setBoardObjects} endpoint="start" />
            <EndpointHandle x={obj.x2} y={obj.y2} obj={obj} setBoardObjects={setBoardObjects} endpoint="end" />
            <BendHandle x={handleX} y={handleY} obj={obj} setBoardObjects={setBoardObjects} />
          </>
        )}
      </svg>
      {isSelected && !isMultiSelected && <DrawingColorToolbar obj={obj} midX={midX} midY={midY} updateProp={updateProp} />}
    </>
  );
}

function ArrowDrawing({ obj, isSelected, handleMouseDown, updateProp, isMultiSelected, onContextMenu, setBoardObjects }) {
  const midX = (obj.x1 + obj.x2) / 2;
  const midY = (obj.y1 + obj.y2) / 2;
  const hasBend = obj.cx != null;
  const pathD = hasBend ? `M ${obj.x1} ${obj.y1} Q ${obj.cx} ${obj.cy} ${obj.x2} ${obj.y2}` : `M ${obj.x1} ${obj.y1} L ${obj.x2} ${obj.y2}`;
  const handleX = hasBend ? 0.25 * obj.x1 + 0.5 * obj.cx + 0.25 * obj.x2 : midX;
  const handleY = hasBend ? 0.25 * obj.y1 + 0.5 * obj.cy + 0.25 * obj.y2 : midY;
  const sw = obj.strokeWidth || 3;
  const chevW = Math.max(14, 6 + sw * 2.5);
  const chevH = Math.max(16, 8 + sw * 2.5);
  const chevSw = Math.max(2.5, sw * 0.9);
  const markerId = `arrowhead-${obj.id}`;
  return (
    <>
      <svg key={obj.id} style={SVG_STYLE_INTERACTIVE}>
        <defs>
          <marker id={markerId} markerUnits="userSpaceOnUse"
            markerWidth={chevW + chevSw} markerHeight={chevH + chevSw}
            viewBox={`${-chevSw} ${-chevSw} ${chevW + chevSw * 2} ${chevH + chevSw * 2}`}
            refX={chevW} refY={chevH / 2} orient="auto" overflow="visible">
            <path d={`M 0 0 L ${chevW} ${chevH / 2} L 0 ${chevH}`}
              fill="none" stroke={obj.color} strokeWidth={chevSw}
              strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <path d={pathD}
          stroke="transparent" strokeWidth={Math.max(sw, 30)} fill="none"
          strokeLinecap="round" style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)} onContextMenu={(e) => onContextMenu?.(e, obj.id)} />
        <path d={pathD}
          stroke={obj.color} strokeWidth={sw} fill="none"
          strokeLinecap="round" strokeDasharray={obj.strokeDasharray || 'none'}
          markerEnd={`url(#${markerId})`} pointerEvents="none" opacity={obj.opacity ?? 1} />
        {isSelected && !isMultiSelected && (
          <>
            <EndpointHandle x={obj.x1} y={obj.y1} obj={obj} setBoardObjects={setBoardObjects} endpoint="start" />
            <EndpointHandle x={obj.x2} y={obj.y2} obj={obj} setBoardObjects={setBoardObjects} endpoint="end" />
            <BendHandle x={handleX} y={handleY} obj={obj} setBoardObjects={setBoardObjects} />
          </>
        )}
      </svg>
      {isSelected && !isMultiSelected && <DrawingColorToolbar obj={obj} midX={midX} midY={midY} updateProp={updateProp} />}
    </>
  );
}

function Comment({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, handleMouseDown, setBoardObjects, theme, isMultiSelected, user, onContextMenu }) {
  const [expanded, setExpanded] = useLocalState(isEditing || isSelected);
  const [replying, setReplying] = useLocalState(false);
  const [replyText, setReplyText] = useLocalState('');
  const hasText = obj.text && obj.text.trim().length > 0;
  const showBubble = expanded || isEditing;
  const authorInitial = (obj.author || '?')[0].toUpperCase();
  const pinColor = obj.avatar_color || '#667eea';
  const replies = obj.replies || [];
  const replyCount = replies.length;

  const submitReply = () => {
    const text = replyText.trim();
    if (!text) { setReplying(false); setReplyText(''); return; }
    const avatarEmoji = user?.user_metadata?.avatar_emoji || null;
    const avatarColor = user?.user_metadata?.avatar_color || null;
    const newReply = {
      id: `r${Date.now()}`,
      text,
      author: user?.email || 'Anonymous',
      avatar_emoji: avatarEmoji,
      avatar_color: avatarColor,
      timestamp: Date.now(),
    };
    setBoardObjects(prev => prev.map(o =>
      o.id === obj.id ? { ...o, replies: [...(o.replies || []), newReply] } : o
    ));
    setReplyText('');
    setReplying(false);
  };

  return (
    <div key={obj.id} style={{ position: 'absolute', left: obj.x, top: obj.y }}>
      {/* Pin icon */}
      <div
        onMouseDown={(e) => { if (!isEditing) handleMouseDown(e, obj.id); }}
        onContextMenu={(e) => onContextMenu?.(e, obj.id)}
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isEditing) { setEditingId(obj.id); setEditingText(obj.text || ''); }
        }}
        style={{
          width: '36px', height: '36px', borderRadius: '50% 50% 50% 0',
          background: isSelected ? '#2196F3' : pinColor,
          border: isSelected ? '2px solid #90caf9' : '2px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          transform: 'rotate(-45deg)', transition: 'all 0.2s',
          zIndex: 10, position: 'relative',
        }}
      >
        {obj.avatar_emoji
          ? <span style={{ transform: 'rotate(45deg)', fontSize: '16px' }}>{obj.avatar_emoji}</span>
          : <MessageSquare size={16} style={{ transform: 'rotate(45deg)', color: 'white' }} />
        }
        {/* Reply count badge */}
        {replyCount > 0 && !showBubble && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            transform: 'rotate(45deg)',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#f472b6', color: 'white',
            fontSize: '9px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid rgba(30,30,40,0.9)',
          }}>
            {replyCount}
          </div>
        )}
      </div>

      {/* Comment bubble */}
      {showBubble && (
        <div style={{
          position: 'absolute', top: -8, left: 44,
          minWidth: '220px', maxWidth: '300px',
          background: 'rgba(30, 30, 40, 0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
          padding: '10px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 11, position: 'relative',
        }}>
          {/* Minimize button */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false); setReplying(false); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '20px', height: '20px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(160,175,220,0.5)',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#c4d0ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(160,175,220,0.5)'; }}
          >
            <Minus size={10} />
          </button>
          {/* Delete comment button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBoardObjects(prev => prev.filter(o => {
                if (o.id === obj.id) return false;
                if (o.type === 'connector' && (o.fromId === obj.id || o.toId === obj.id)) return false;
                return true;
              }));
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '6px', right: '28px',
              width: '20px', height: '20px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(160,175,220,0.5)',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(160,175,220,0.5)'; }}
          >
            <Trash2 size={10} />
          </button>
          {/* Author & time */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '6px', fontSize: '11px', color: '#94a3b8',
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: pinColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: obj.avatar_emoji ? '11px' : '10px', fontWeight: '700',
              color: 'white',
            }}>
              {obj.avatar_emoji || authorInitial}
            </div>
            <span style={{ fontWeight: '600', color: '#c4d0ff' }}>
              {obj.author || 'Anonymous'}
            </span>
          </div>

          {/* Text content */}
          {isEditing ? (
            <textarea
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={() => {
                setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: editingText } : o));
                setEditingId(null);
              }}
              onKeyDown={(e) => { if (e.key === 'Escape') e.target.blur(); }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Add a comment..."
              style={{
                width: '100%', minHeight: '40px', border: 'none', outline: 'none',
                background: 'rgba(255,255,255,0.05)', borderRadius: '6px',
                padding: '6px 8px', fontSize: '13px', color: '#e0e8f8',
                fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          ) : (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!isEditing) { setEditingId(obj.id); setEditingText(obj.text || ''); }
              }}
              style={{
                fontSize: '13px', color: '#e0e8f8', lineHeight: '1.4',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                cursor: 'pointer',
              }}
            >
              {hasText ? obj.text : <span style={{ color: '#475569', fontStyle: 'italic' }}>Double-click to add comment...</span>}
            </div>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <div style={{
              marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              {replies.map((r) => {
                const rInitial = (r.author || '?')[0].toUpperCase();
                const rColor = r.avatar_color || '#667eea';
                return (
                  <div key={r.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: rColor, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: r.avatar_emoji ? '10px' : '8px',
                      fontWeight: '700', color: 'white', flexShrink: 0, marginTop: '1px',
                    }}>
                      {r.avatar_emoji || rInitial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#a0b4e0' }}>
                        {r.author || 'Anonymous'}
                      </span>
                      <div style={{
                        fontSize: '12px', color: '#c8d4e8', lineHeight: '1.35',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '1px',
                      }}>
                        {r.text}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBoardObjects(prev => prev.map(o =>
                          o.id === obj.id
                            ? { ...o, replies: (o.replies || []).filter(rep => rep.id !== r.id) }
                            : o
                        ));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        background: 'none', border: 'none', color: 'rgba(160,175,220,0.3)',
                        cursor: 'pointer', padding: '2px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'color 0.2s', marginTop: '1px',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(160,175,220,0.3)'; }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply button / input */}
          {!isEditing && (
            replying ? (
              <div style={{ marginTop: '8px' }}>
                <textarea
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onBlur={() => { if (!replyText.trim()) { setReplying(false); setReplyText(''); } }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); }
                    if (e.key === 'Escape') { setReplying(false); setReplyText(''); }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Write a reply..."
                  style={{
                    width: '100%', minHeight: '32px', border: 'none', outline: 'none',
                    background: 'rgba(255,255,255,0.05)', borderRadius: '6px',
                    padding: '5px 8px', fontSize: '12px', color: '#e0e8f8',
                    fontFamily: 'inherit', resize: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setReplying(false); setReplyText(''); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background: 'none', border: 'none', color: '#64748b',
                      fontSize: '11px', cursor: 'pointer', padding: '2px 6px',
                    }}
                  >Cancel</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); submitReply(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background: '#667eea', border: 'none', color: 'white',
                      fontSize: '11px', cursor: 'pointer', padding: '2px 10px',
                      borderRadius: '4px', fontWeight: '600',
                    }}
                  >Reply</button>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setReplying(true); }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  marginTop: '6px', background: 'none', border: 'none',
                  color: '#64748b', fontSize: '11px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '2px 0', transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#a0b4e0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
              >
                <Reply size={12} /> Reply
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ConnectorObject({ obj, isSelected, handleMouseDown, updateProp, isMultiSelected, onContextMenu }) {
  const { x1, y1, x2, y2, resolvedFromAnchor, resolvedToAnchor } = obj;
  if (x1 == null || x2 == null) return null;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const isArrow = obj.style !== 'line';
  const color = obj.color || '#8B8FA3';
  const sw = obj.strokeWidth || 2;
  const chevW = Math.max(14, 6 + sw * 2.5);
  const chevH = Math.max(16, 8 + sw * 2.5);
  const chevSw = Math.max(2.5, sw * 0.9);
  const pathD = computeCurvedConnectorPath(
    x1, y1, x2, y2,
    resolvedFromAnchor || obj.fromAnchor || 'right',
    resolvedToAnchor || obj.toAnchor || 'left',
    obj.fromBounds, obj.toBounds
  );
  return (
    <>
      <svg style={SVG_STYLE_INTERACTIVE}>
        {isArrow && (
          <defs>
            <marker id={`conn-${obj.id}`} markerUnits="userSpaceOnUse"
              markerWidth={chevW + chevSw} markerHeight={chevH + chevSw}
              viewBox={`${-chevSw} ${-chevSw} ${chevW + chevSw * 2} ${chevH + chevSw * 2}`}
              refX={chevW} refY={chevH / 2} orient="auto" overflow="visible">
              <path d={`M 0 0 L ${chevW} ${chevH / 2} L 0 ${chevH}`}
                fill="none" stroke={color} strokeWidth={chevSw}
                strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
        )}
        {/* Wide invisible hit target for clicking */}
        <path d={pathD}
          stroke="transparent" strokeWidth={Math.max(sw, 30)}
          fill="none" strokeLinecap="round"
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)} onContextMenu={(e) => onContextMenu?.(e, obj.id)} />
        {/* Selection glow */}
        {isSelected && (
          <path d={pathD}
            stroke="#2196F3" strokeWidth={sw + 6}
            fill="none" strokeLinecap="round" opacity={0.35} pointerEvents="none" />
        )}
        {/* Visible curved connector */}
        <path d={pathD}
          stroke={color} strokeWidth={sw}
          fill="none" strokeLinecap="butt"
          strokeDasharray={obj.strokeDasharray || 'none'}
          markerEnd={isArrow ? `url(#conn-${obj.id})` : undefined}
          pointerEvents="none" opacity={obj.opacity ?? 1} />
      </svg>
      {isSelected && !isMultiSelected && <DrawingColorToolbar obj={obj} midX={midX} midY={midY} updateProp={updateProp} />}
    </>
  );
}

function EmojiSticker({ obj, isSelected, handleMouseDown, setIsResizing, setResizeHandle, setIsRotating, isMultiSelected, onContextMenu }) {
  return (
    <div key={obj.id} style={{
      position: 'absolute', left: obj.x, top: obj.y,
      width: obj.width || 48, height: obj.height || 48,
      transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
      transformOrigin: 'center center',
    }}>
      {isSelected && !isMultiSelected && <RotationHandle setIsRotating={setIsRotating} />}
      <div
        onMouseDown={(e) => handleMouseDown(e, obj.id)}
        onContextMenu={(e) => onContextMenu?.(e, obj.id)}
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${Math.min(obj.width || 48, obj.height || 48) * 0.75}px`,
          cursor: 'move', userSelect: 'none',
          filter: isSelected ? 'drop-shadow(0 0 6px rgba(33,150,243,0.5))' : 'none',
          transition: 'filter 0.2s',
        }}
      >
        {obj.emoji}
      </div>
      {isSelected && !isMultiSelected && (
        <SelectionOutline obj={obj} setIsResizing={setIsResizing} setResizeHandle={setResizeHandle} />
      )}
    </div>
  );
}

function RotationHandle({ setIsRotating }) {
  return (
    <>
      <div style={{
        position: 'absolute', left: '50%', bottom: -20,
        width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)',
        transform: 'translateX(-50%)',
        pointerEvents: 'none', zIndex: 99,
      }} />
      <div
        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setIsRotating(true); }}
        style={{
          position: 'absolute', left: '50%', bottom: -46,
          width: '26px', height: '26px',
          background: 'rgba(30,30,40,0.9)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          transform: 'translateX(-50%)',
          cursor: 'grab', zIndex: 102,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <RotateCw size={13} color="rgba(255,255,255,0.8)" />
      </div>
    </>
  );
}

function SelectionOutline({ obj, setIsResizing, setResizeHandle }) {
  const w = obj.width || 100;
  const h = obj.height || 100;
  const corners = [
    { key: 'nw', style: { top: -5, left: -5, cursor: 'nwse-resize' } },
    { key: 'ne', style: { top: -5, right: -5, cursor: 'nesw-resize' } },
    { key: 'sw', style: { bottom: -5, left: -5, cursor: 'nesw-resize' } },
    { key: 'se', style: { bottom: -5, right: -5, cursor: 'nwse-resize' } },
  ];
  return (
    <>
      {/* Thin selection border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: w, height: h,
        border: '1.5px solid #4a90d9',
        borderRadius: '2px', pointerEvents: 'none', zIndex: 999,
      }} />
      {/* Corner handles */}
      {corners.map(c => (
        <div
          key={c.key}
          onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); setResizeHandle(c.key); }}
          style={{
            position: 'absolute', ...c.style,
            width: '10px', height: '10px',
            background: 'white', border: '1.5px solid #4a90d9',
            borderRadius: '50%', zIndex: 1000,
            cursor: c.style.cursor,
          }}
        />
      ))}
    </>
  );
}
