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
