import { memo, useState as useLocalState } from 'react';
import { Bold, AlignLeft, AlignCenter, RotateCw, MessageSquare, Minus, Reply } from 'lucide-react';
import { getColor, STICKY_COLORS, FONT_SIZES, SHAPE_COLORS, STROKE_SIZES, TEXT_COLORS, DRAW_COLORS } from '../../lib/theme';

export default memo(function BoardObject({
  obj, isSelected, isEditing, editingText,
  setEditingId, setEditingText,
  handleMouseDown, setBoardObjects,
  setIsResizing, setResizeHandle, setIsRotating, isMultiSelected, theme, user,
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
      setIsRotating={setIsRotating} isMultiSelected={isMultiSelected}
    />;
  }

  if (obj.type === 'shape') {
    return <Shape
      obj={obj} isSelected={isSelected}
      handleMouseDown={handleMouseDown} updateProp={updateProp}
      setIsResizing={setIsResizing} setResizeHandle={setResizeHandle}
      setIsRotating={setIsRotating} isMultiSelected={isMultiSelected}
    />;
  }

  if (obj.type === 'text') {
    return <TextObject
      obj={obj} isSelected={isSelected} isEditing={isEditing}
      editingText={editingText} setEditingId={setEditingId}
      setEditingText={setEditingText} handleMouseDown={handleMouseDown}
      setBoardObjects={setBoardObjects} updateProp={updateProp} theme={theme}
      setIsRotating={setIsRotating} isMultiSelected={isMultiSelected}
    />;
  }

  if (obj.type === 'frame') {
    return <Frame obj={obj} isSelected={isSelected} isEditing={isEditing} editingText={editingText} setEditingId={setEditingId} setEditingText={setEditingText} setBoardObjects={setBoardObjects} handleMouseDown={handleMouseDown} theme={theme} setIsResizing={setIsResizing} setResizeHandle={setResizeHandle} setIsRotating={setIsRotating} isMultiSelected={isMultiSelected} />;
  }

  if (obj.type === 'comment') {
    return <Comment
      obj={obj} isSelected={isSelected} isEditing={isEditing}
      editingText={editingText} setEditingId={setEditingId}
      setEditingText={setEditingText} handleMouseDown={handleMouseDown}
      setBoardObjects={setBoardObjects} theme={theme}
      isMultiSelected={isMultiSelected} user={user}
    />;
  }

  if (obj.type === 'path') return <PathDrawing obj={obj} isSelected={isSelected} handleMouseDown={handleMouseDown} updateProp={updateProp} isMultiSelected={isMultiSelected} />;
  if (obj.type === 'line') return <LineDrawing obj={obj} isSelected={isSelected} handleMouseDown={handleMouseDown} updateProp={updateProp} isMultiSelected={isMultiSelected} />;
  if (obj.type === 'arrow') return <ArrowDrawing obj={obj} isSelected={isSelected} handleMouseDown={handleMouseDown} updateProp={updateProp} isMultiSelected={isMultiSelected} />;

  return null;
}, (prev, next) =>
  prev.obj === next.obj &&
  prev.isSelected === next.isSelected &&
  prev.isEditing === next.isEditing &&
  prev.editingText === next.editingText &&
  prev.theme === next.theme &&
  prev.isMultiSelected === next.isMultiSelected
)

function StickyNote({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, handleMouseDown, setBoardObjects, updateProp, setIsRotating, isMultiSelected }) {
  const noteFontSize = obj.fontSize || 14;
  const noteBold = obj.fontWeight === 'bold';
  const noteAlign = obj.textAlign || 'left';
  const showToolbar = (isSelected || isEditing) && !isMultiSelected;

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
              onClick={() => updateProp(obj.id, 'fontSize', fs.value)}
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
            onClick={() => updateProp(obj.id, 'fontWeight', noteBold ? 'normal' : 'bold')}
            style={{
              width: '26px', height: '26px', border: 'none', borderRadius: '6px',
              background: noteBold ? 'rgba(56,189,248,0.2)' : 'transparent',
              color: noteBold ? '#38bdf8' : '#94a3b8',
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
              onClick={() => updateProp(obj.id, 'textAlign', align)}
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
              onClick={() => updateProp(obj.id, 'color', c)}
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
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isEditing) { setEditingId(obj.id); setEditingText(obj.text); }
        }}
        style={{
          width: obj.width, height: obj.height,
          backgroundColor: getColor(obj.color),
          border: isSelected ? '3px solid #2196F3' : '1px solid rgba(0,0,0,0.08)',
          borderRadius: '2px 2px 4px 4px', padding: '16px',
          cursor: isEditing ? 'text' : 'move',
          boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 4px 6px rgba(0,0,0,0.06), 0 10px 14px -4px rgba(0,0,0,0.1), 2px 12px 16px -2px rgba(0,0,0,0.08)',
          fontSize: `${noteFontSize}px`, fontWeight: obj.fontWeight || 'normal',
          textAlign: noteAlign, overflow: 'auto',
          userSelect: isEditing ? 'text' : 'none', boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 100%)',
          borderRadius: '2px 2px 0 0', pointerEvents: 'none',
        }} />
        {isEditing ? (
          <textarea
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => {
              setBoardObjects(prev => prev.map(o => o.id === obj.id ? { ...o, text: editingText } : o));
              setEditingId(null);
            }}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null); }}
            style={{
              width: '100%', height: '100%', border: 'none', outline: 'none',
              background: 'transparent', fontSize: 'inherit', fontWeight: 'inherit',
              textAlign: 'inherit', fontFamily: 'inherit', resize: 'none', color: 'inherit',
            }}
          />
        ) : (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{obj.text}</span>
        )}
      </div>
    </div>
  );
}

function Shape({ obj, isSelected, handleMouseDown, updateProp, setIsResizing, setResizeHandle, setIsRotating, isMultiSelected }) {
  const w = obj.width || 100;
  const h = obj.height || 100;
  const fillColor = getColor(obj.color);
  const userStrokeW = obj.strokeWidth ?? 2;
  const strokeColor = isSelected ? '#2196F3' : (obj.strokeColor || 'rgba(0,0,0,0.3)');
  const strokeW = isSelected ? Math.max(userStrokeW, 3) : userStrokeW;

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
      {isSelected && !isMultiSelected && (
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
          {SHAPE_COLORS.map(c => (
            <button
              key={c.name}
              onClick={() => updateProp(obj.id, 'color', c.name)}
              style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: obj.color === c.name ? '2px solid #fff' : '2px solid transparent',
                background: c.hex, cursor: 'pointer', padding: 0,
                boxShadow: obj.color === c.name ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
              title={c.name}
            />
          ))}
          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {STROKE_SIZES.map(s => (
            <button
              key={s.value}
              onClick={() => updateProp(obj.id, 'strokeWidth', s.value)}
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
        </div>
      )}

      <svg width={w} height={h} onMouseDown={(e) => handleMouseDown(e, obj.id)} style={{ cursor: 'move', display: 'block' }}>
        {getShapePath()}
      </svg>

      {isSelected && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); setResizeHandle('se'); }}
          style={{
            position: 'absolute', bottom: -4, right: -4,
            width: '12px', height: '12px', background: '#2196F3',
            border: '2px solid white', borderRadius: '50%',
            cursor: 'nwse-resize', zIndex: 1000,
          }}
        />
      )}
    </div>
  );
}

function TextObject({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, handleMouseDown, setBoardObjects, updateProp, theme, setIsRotating, isMultiSelected }) {
  const textFontSize = obj.fontSize || 16;
  const textBold = obj.fontWeight === 'bold';
  const textAlign = obj.textAlign || 'left';
  const textColor = obj.color || theme.text;
  const showToolbar = (isSelected || isEditing) && !isMultiSelected;

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
              onClick={() => updateProp(obj.id, 'fontSize', fs.value)}
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
            onClick={() => updateProp(obj.id, 'fontWeight', textBold ? 'normal' : 'bold')}
            style={{
              width: '26px', height: '26px', border: 'none', borderRadius: '6px',
              background: textBold ? 'rgba(56,189,248,0.2)' : 'transparent',
              color: textBold ? '#38bdf8' : '#94a3b8',
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
              onClick={() => updateProp(obj.id, 'textAlign', align)}
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
          {TEXT_COLORS.map(c => (
            <button
              key={c.name}
              onClick={() => updateProp(obj.id, 'color', c.hex)}
              style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: textColor === c.hex ? '2px solid #fff' : '2px solid transparent',
                background: c.hex, cursor: 'pointer', padding: 0,
                boxShadow: textColor === c.hex ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
              title={c.name}
            />
          ))}
        </div>
      )}

      <div
        onMouseDown={(e) => { if (!isEditing) handleMouseDown(e, obj.id); }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isEditing) { setEditingId(obj.id); setEditingText(obj.text); }
        }}
        style={{
          width: isEditing ? (obj.width || undefined) : (obj.width ? obj.width : 'fit-content'),
          minWidth: isEditing ? '200px' : '20px',
          padding: '8px', position: 'relative',
          border: isSelected ? '2px solid #2196F3' : '2px solid transparent',
          borderRadius: '4px', cursor: isEditing ? 'text' : 'move',
          fontSize: `${textFontSize}px`, fontFamily: 'system-ui, sans-serif',
          fontWeight: obj.fontWeight || 'normal', textAlign: textAlign,
          color: textColor, userSelect: isEditing ? 'text' : 'none',
          whiteSpace: 'pre-wrap', boxSizing: 'border-box',
        }}
      >
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
            style={{
              width: '100%', minHeight: '24px', border: 'none', outline: 'none',
              background: 'transparent', fontSize: 'inherit', fontWeight: 'inherit',
              textAlign: 'inherit', fontFamily: 'inherit', resize: 'none',
              color: 'inherit', whiteSpace: 'pre-wrap',
            }}
          />
        ) : (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{obj.text}</span>
        )}
      </div>
    </div>
  );
}

function Frame({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, setBoardObjects, handleMouseDown, theme, setIsResizing, setResizeHandle, setIsRotating, isMultiSelected }) {
  return (
    <div
      key={obj.id}
      onMouseDown={(e) => { if (!isEditing) handleMouseDown(e, obj.id); }}
      style={{
        position: 'absolute', left: obj.x, top: obj.y,
        width: obj.width, height: obj.height,
        border: isSelected ? '3px solid #2196F3' : `2px dashed ${theme.textSecondary}`,
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
      {isSelected && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); setResizeHandle('se'); }}
          style={{
            position: 'absolute', bottom: -4, right: -4,
            width: '12px', height: '12px', background: '#2196F3',
            border: '2px solid white', borderRadius: '50%',
            cursor: 'nwse-resize', zIndex: 1000,
          }}
        />
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
  return (
    <div
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
      style={{
        position: 'absolute', left: midX, top: midY - 40,
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '2px',
        background: 'rgba(30,30,40,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
        padding: '4px 6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'auto',
      }}
    >
      {DRAW_COLORS.map(c => (
        <button
          key={c}
          onClick={() => updateProp(obj.id, 'color', c)}
          style={{
            width: '18px', height: '18px', borderRadius: '50%',
            border: obj.color === c ? '2px solid #fff' : '2px solid transparent',
            background: c, cursor: 'pointer', padding: 0,
            boxShadow: obj.color === c ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
            transition: 'all 0.15s',
          }}
        />
      ))}
    </div>
  );
}

function PathDrawing({ obj, isSelected, handleMouseDown, updateProp, isMultiSelected }) {
  if (obj.points.length < 2) return null;
  const d = obj.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const mid = obj.points[Math.floor(obj.points.length / 2)];
  return (
    <>
      <svg key={obj.id} style={SVG_STYLE_INTERACTIVE}>
        <path d={d} stroke="transparent" strokeWidth={Math.max(obj.strokeWidth || 3, 16)} fill="none"
          strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)} />
        <path d={d} stroke={obj.color} strokeWidth={obj.strokeWidth} fill="none"
          strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      </svg>
      {isSelected && !isMultiSelected && <DrawingColorToolbar obj={obj} midX={mid.x} midY={mid.y} updateProp={updateProp} />}
    </>
  );
}

function LineDrawing({ obj, isSelected, handleMouseDown, updateProp, isMultiSelected }) {
  const midX = (obj.x1 + obj.x2) / 2;
  const midY = (obj.y1 + obj.y2) / 2;
  return (
    <>
      <svg key={obj.id} style={SVG_STYLE_INTERACTIVE}>
        <line x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2}
          stroke="transparent" strokeWidth={Math.max(obj.strokeWidth || 3, 16)}
          strokeLinecap="round" style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)} />
        <line x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2}
          stroke={obj.color} strokeWidth={obj.strokeWidth}
          strokeLinecap="round" strokeDasharray={obj.strokeDasharray || 'none'} pointerEvents="none" />
      </svg>
      {isSelected && !isMultiSelected && <DrawingColorToolbar obj={obj} midX={midX} midY={midY} updateProp={updateProp} />}
    </>
  );
}

function ArrowDrawing({ obj, isSelected, handleMouseDown, updateProp, isMultiSelected }) {
  const arrowSize = 12;
  const midX = (obj.x1 + obj.x2) / 2;
  const midY = (obj.y1 + obj.y2) / 2;
  return (
    <>
      <svg key={obj.id} style={SVG_STYLE_INTERACTIVE}>
        <defs>
          <marker id={`arrowhead-${obj.id}`} markerWidth={arrowSize} markerHeight={arrowSize}
            refX={arrowSize - 2} refY={arrowSize / 2} orient="auto">
            <polygon points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`} fill={obj.color} />
          </marker>
        </defs>
        <line x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2}
          stroke="transparent" strokeWidth={Math.max(obj.strokeWidth || 3, 16)}
          strokeLinecap="round" style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)} />
        <line x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2}
          stroke={obj.color} strokeWidth={obj.strokeWidth}
          strokeLinecap="round" strokeDasharray={obj.strokeDasharray || 'none'} markerEnd={`url(#arrowhead-${obj.id})`} pointerEvents="none" />
      </svg>
      {isSelected && !isMultiSelected && <DrawingColorToolbar obj={obj} midX={midX} midY={midY} updateProp={updateProp} />}
    </>
  );
}

function Comment({ obj, isSelected, isEditing, editingText, setEditingId, setEditingText, handleMouseDown, setBoardObjects, theme, isMultiSelected, user }) {
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
