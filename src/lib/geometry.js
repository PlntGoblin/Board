// Rotate point (px, py) around center (cx, cy) by angleDeg degrees
function rotatePoint(px, py, cx, cy, angleDeg) {
  if (!angleDeg) return { x: px, y: py };
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + (px - cx) * cos - (py - cy) * sin,
    y: cy + (px - cx) * sin + (py - cy) * cos,
  };
}

export function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function getObjBounds(obj) {
  if (obj.type === 'path' && obj.points?.length) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of obj.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  if (obj.type === 'line' || obj.type === 'arrow') {
    const x = Math.min(obj.x1, obj.x2), y = Math.min(obj.y1, obj.y2);
    return { x, y, w: Math.abs(obj.x2 - obj.x1), h: Math.abs(obj.y2 - obj.y1) };
  }
  return { x: obj.x || 0, y: obj.y || 0, w: obj.width || 100, h: obj.height || 100 };
}

export function boxesIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Compute the 5 star tip positions in absolute coordinates
function getStarTips(obj) {
  const b = getObjBounds(obj);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const outer = Math.min(b.w, b.h) / 2 - 2;
  return Array.from({ length: 5 }, (_, i) => {
    const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
    return { x: cx + outer * Math.cos(a), y: cy + outer * Math.sin(a) };
  });
}

const STAR_ANCHOR_NAMES = ['star0', 'star1', 'star2', 'star3', 'star4'];
const HEX_ANCHOR_NAMES = ['hex0', 'hex1', 'hex2', 'hex3', 'hex4', 'hex5'];
const TRI_ANCHOR_NAMES = ['tri0', 'tri1', 'tri2'];
const DIA_ANCHOR_NAMES = ['dia0', 'dia1', 'dia2', 'dia3'];

// Compute the 3 triangle side midpoints in absolute coordinates
// Sides: right (top→bottom-right), bottom (bottom-right→bottom-left), left (bottom-left→top)
function getTriSideMidpoints(obj) {
  const b = getObjBounds(obj);
  const v0 = { x: b.x + b.w / 2, y: b.y + 2 };
  const v1 = { x: b.x + b.w - 2, y: b.y + b.h - 2 };
  const v2 = { x: b.x + 2,        y: b.y + b.h - 2 };
  return [
    { x: (v0.x + v1.x) / 2, y: (v0.y + v1.y) / 2 }, // right side midpoint
    { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 }, // bottom side midpoint
    { x: (v2.x + v0.x) / 2, y: (v2.y + v0.y) / 2 }, // left side midpoint
  ];
}

// Compute the 4 diamond side midpoints in absolute coordinates
// Vertices: top, right, bottom, left. Sides: top-right, bottom-right, bottom-left, top-left
function getDiaSideMidpoints(obj) {
  const b = getObjBounds(obj);
  const v0 = { x: b.x + b.w / 2, y: b.y + 2 };
  const v1 = { x: b.x + b.w - 2, y: b.y + b.h / 2 };
  const v2 = { x: b.x + b.w / 2, y: b.y + b.h - 2 };
  const v3 = { x: b.x + 2,        y: b.y + b.h / 2 };
  return [
    { x: (v0.x + v1.x) / 2, y: (v0.y + v1.y) / 2 }, // top-right side
    { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 }, // bottom-right side
    { x: (v2.x + v3.x) / 2, y: (v2.y + v3.y) / 2 }, // bottom-left side
    { x: (v3.x + v0.x) / 2, y: (v3.y + v0.y) / 2 }, // top-left side
  ];
}

// Compute the 6 hexagon vertex positions in absolute coordinates
function getHexVertices(obj) {
  const b = getObjBounds(obj);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rx = b.w / 2 - 2, ry = b.h / 2 - 2;
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

// Compute the 6 hexagon side midpoints (between adjacent vertices)
function getHexSideMidpoints(obj) {
  const verts = getHexVertices(obj);
  return Array.from({ length: 6 }, (_, i) => {
    const next = (i + 1) % 6;
    return { x: (verts[i].x + verts[next].x) / 2, y: (verts[i].y + verts[next].y) / 2 };
  });
}

// Get all anchor names for an object
export function getAnchorNames(obj) {
  if (obj.type === 'shape' && obj.shapeType === 'star') return STAR_ANCHOR_NAMES;
  if (obj.type === 'shape' && obj.shapeType === 'hexagon') return HEX_ANCHOR_NAMES;
  if (obj.type === 'shape' && obj.shapeType === 'triangle') return TRI_ANCHOR_NAMES;
  if (obj.type === 'shape' && obj.shapeType === 'diamond') return DIA_ANCHOR_NAMES;
  return ['top', 'right', 'bottom', 'left'];
}

// Get the pixel position of a named anchor on an object
export function getAnchorPoint(obj, anchor) {
  let point;

  if (anchor.startsWith('star')) {
    const tips = getStarTips(obj);
    const idx = parseInt(anchor[4], 10);
    point = tips[idx] || tips[0];
  } else if (anchor.startsWith('dia')) {
    const mids = getDiaSideMidpoints(obj);
    const idx = parseInt(anchor[3], 10);
    point = mids[idx] || mids[0];
  } else if (anchor.startsWith('tri')) {
    const mids = getTriSideMidpoints(obj);
    const idx = parseInt(anchor[3], 10);
    point = mids[idx] || mids[0];
  } else if (anchor.startsWith('hex')) {
    const mids = getHexSideMidpoints(obj);
    const idx = parseInt(anchor[3], 10);
    point = mids[idx] || mids[0];
  } else {
    const b = getObjBounds(obj);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    switch (anchor) {
      case 'top':    point = { x: cx,        y: b.y        }; break;
      case 'right':  point = { x: b.x + b.w, y: cy         }; break;
      case 'bottom': point = { x: cx,        y: b.y + b.h  }; break;
      case 'left':   point = { x: b.x,       y: cy         }; break;
      default:       point = { x: cx,        y: cy         }; break;
    }
  }

  // Apply rotation if the object has one — rotates anchor around object center
  if (obj.rotation) {
    const b = getObjBounds(obj);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return rotatePoint(point.x, point.y, cx, cy, obj.rotation);
  }
  return point;
}

// Find which anchor is closest to a given point
export function getNearestAnchor(obj, px, py) {
  const anchors = getAnchorNames(obj);
  let best = anchors[0], bestDist = Infinity;
  for (const a of anchors) {
    const pt = getAnchorPoint(obj, a);
    const d = Math.hypot(px - pt.x, py - pt.y);
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best;
}

const STAR_EXIT = Array.from({ length: 5 }, (_, i) => {
  const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
  return { dx: Math.cos(a), dy: Math.sin(a) };
});
const HEX_EXIT = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2 + Math.PI / 6;
  return { dx: Math.cos(a), dy: Math.sin(a) };
});
// Outward normals for each triangle side (right side, bottom, left side)
const TRI_EXIT = (() => {
  // Vertices in local coords: top(1,0), bottom-right(2,2), bottom-left(0,2)
  const edges = [[1,0,2,2],[2,2,0,2],[0,2,1,0]];
  return edges.map(([x1,y1,x2,y2]) => {
    const ex = x2 - x1, ey = y2 - y1;
    const len = Math.hypot(ey, -ex);
    return { dx: ey / len, dy: -ex / len };
  });
})();
const S = Math.SQRT1_2; // ~0.707
const DIA_EXIT = [
  { dx: S, dy: -S },  // top-right side → outward upper-right
  { dx: S, dy: S },   // bottom-right side → outward lower-right
  { dx: -S, dy: S },  // bottom-left side → outward lower-left
  { dx: -S, dy: -S }, // top-left side → outward upper-left
];
const EXIT_DIRS = {
  top: { dx: 0, dy: -1 }, right: { dx: 1, dy: 0 }, bottom: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 },
  star0: STAR_EXIT[0], star1: STAR_EXIT[1], star2: STAR_EXIT[2], star3: STAR_EXIT[3], star4: STAR_EXIT[4],
  hex0: HEX_EXIT[0], hex1: HEX_EXIT[1], hex2: HEX_EXIT[2], hex3: HEX_EXIT[3], hex4: HEX_EXIT[4], hex5: HEX_EXIT[5],
  tri0: TRI_EXIT[0], tri1: TRI_EXIT[1], tri2: TRI_EXIT[2],
  dia0: DIA_EXIT[0], dia1: DIA_EXIT[1], dia2: DIA_EXIT[2], dia3: DIA_EXIT[3],
};

// Compute connector endpoints from stored anchors, or auto-pick best sides
export function getConnectorEndpoints(fromObj, toObj, fromAnchor, toAnchor) {
  if (fromAnchor && toAnchor) {
    const f = getAnchorPoint(fromObj, fromAnchor);
    const t = getAnchorPoint(toObj, toAnchor);
    return { x1: f.x, y1: f.y, x2: t.x, y2: t.y, resolvedFromAnchor: fromAnchor, resolvedToAnchor: toAnchor };
  }
  const fb = getObjBounds(fromObj);
  const tb = getObjBounds(toObj);
  const fcx = fb.x + fb.w / 2, fcy = fb.y + fb.h / 2;
  const tcx = tb.x + tb.w / 2, tcy = tb.y + tb.h / 2;

  // For stars/hexagons, pick the nearest vertex toward the other object's center
  const VERTEX_SHAPES = ['star', 'hexagon', 'triangle', 'diamond'];
  const fromIsVertex = fromObj.type === 'shape' && VERTEX_SHAPES.includes(fromObj.shapeType);
  const toIsVertex = toObj.type === 'shape' && VERTEX_SHAPES.includes(toObj.shapeType);

  let resolvedFromAnchor, resolvedToAnchor, fromPt, toPt;

  if (fromIsVertex) {
    resolvedFromAnchor = getNearestAnchor(fromObj, tcx, tcy);
    fromPt = getAnchorPoint(fromObj, resolvedFromAnchor);
  }
  if (toIsVertex) {
    resolvedToAnchor = getNearestAnchor(toObj, fcx, fcy);
    toPt = getAnchorPoint(toObj, resolvedToAnchor);
  }

  // Standard directional pick for non-vertex objects
  const dx = tcx - fcx, dy = tcy - fcy;
  if (!fromIsVertex) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      resolvedFromAnchor = dx >= 0 ? 'right' : 'left';
      fromPt = dx >= 0 ? { x: fb.x + fb.w, y: fcy } : { x: fb.x, y: fcy };
    } else {
      resolvedFromAnchor = dy >= 0 ? 'bottom' : 'top';
      fromPt = dy >= 0 ? { x: fcx, y: fb.y + fb.h } : { x: fcx, y: fb.y };
    }
  }
  if (!toIsVertex) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      resolvedToAnchor = dx >= 0 ? 'left' : 'right';
      toPt = dx >= 0 ? { x: tb.x, y: tcy } : { x: tb.x + tb.w, y: tcy };
    } else {
      resolvedToAnchor = dy >= 0 ? 'top' : 'bottom';
      toPt = dy >= 0 ? { x: tcx, y: tb.y } : { x: tcx, y: tb.y + tb.h };
    }
  }

  return { x1: fromPt.x, y1: fromPt.y, x2: toPt.x, y2: toPt.y, resolvedFromAnchor, resolvedToAnchor };
}

// Compute SVG cubic bezier path for a smooth curved connector
// Optional fromBounds/toBounds: { x, y, w, h } of connected objects for smarter routing
export function computeCurvedConnectorPath(x1, y1, x2, y2, fromAnchor, toAnchor, fromBounds, toBounds) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const baseOffset = Math.max(40, Math.min(dist * 0.4, 200));

  const fd = EXIT_DIRS[fromAnchor] || EXIT_DIRS.right;
  const td = EXIT_DIRS[toAnchor] || EXIT_DIRS.left;

  let fromOffset = baseOffset;
  let toOffset = baseOffset;

  // When object bounds are available, extend offsets to route around objects
  if (fromBounds || toBounds) {
    const dotFrom = fd.dx * (x2 - x1) + fd.dy * (y2 - y1);
    const dotTo = td.dx * (x1 - x2) + td.dy * (y1 - y2);

    if (dotFrom < 0 && fromBounds) {
      const dim = fd.dy !== 0 ? fromBounds.h : fromBounds.w;
      fromOffset = Math.max(fromOffset, dim * 0.6 + 50);
    }
    if (dotTo < 0 && toBounds) {
      const dim = td.dy !== 0 ? toBounds.h : toBounds.w;
      toOffset = Math.max(toOffset, dim * 0.6 + 50);
    }
  }

  const cp1x = x1 + fd.dx * fromOffset;
  const cp1y = y1 + fd.dy * fromOffset;
  const cp2x = x2 + td.dx * toOffset;
  const cp2y = y2 + td.dy * toOffset;

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}
