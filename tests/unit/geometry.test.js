import { describe, it, expect } from 'vitest';
import {
  pointToSegmentDist,
  getObjBounds,
  boxesIntersect,
  getAnchorNames,
  getAnchorPoint,
  getNearestAnchor,
  getConnectorEndpoints,
  computeCurvedConnectorPath,
} from '../../src/lib/geometry.js';

// --- pointToSegmentDist ---
describe('pointToSegmentDist', () => {
  it('returns 0 when point is on the segment', () => {
    expect(pointToSegmentDist(5, 0, 0, 0, 10, 0)).toBeCloseTo(0);
  });

  it('returns perpendicular distance for a point off the segment', () => {
    expect(pointToSegmentDist(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
  });

  it('returns distance to nearest endpoint when projection is outside segment', () => {
    // Point is beyond the end of the segment
    expect(pointToSegmentDist(15, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('handles zero-length segment (point)', () => {
    expect(pointToSegmentDist(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
  });

  it('returns distance to start for point before segment start', () => {
    expect(pointToSegmentDist(-3, 4, 0, 0, 10, 0)).toBeCloseTo(5);
  });
});

// --- getObjBounds ---
describe('getObjBounds', () => {
  it('returns bounds for a standard shape object', () => {
    const obj = { x: 10, y: 20, width: 100, height: 50 };
    const b = getObjBounds(obj);
    expect(b).toEqual({ x: 10, y: 20, w: 100, h: 50 });
  });

  it('returns default dimensions when width/height missing', () => {
    const obj = { x: 0, y: 0 };
    const b = getObjBounds(obj);
    expect(b).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });

  it('calculates bounds from path points', () => {
    const obj = {
      type: 'path',
      points: [{ x: 5, y: 10 }, { x: 20, y: 30 }, { x: 0, y: 0 }],
    };
    const b = getObjBounds(obj);
    expect(b).toEqual({ x: 0, y: 0, w: 20, h: 30 });
  });

  it('calculates bounds for line/arrow objects', () => {
    const obj = { type: 'line', x1: 10, y1: 20, x2: 100, y2: 80 };
    const b = getObjBounds(obj);
    expect(b.x).toBe(10);
    expect(b.y).toBe(20);
    expect(b.w).toBe(90);
    expect(b.h).toBe(60);
  });

  it('pads thin line bounds so marquee selection works', () => {
    // Horizontal line — height would be 0 without padding
    const obj = { type: 'line', x1: 0, y1: 50, x2: 100, y2: 50 };
    const b = getObjBounds(obj);
    expect(b.h).toBeGreaterThan(0);
  });

  it('includes control point cx/cy in connector bounds', () => {
    const obj = { type: 'connector', x1: 0, y1: 0, x2: 100, y2: 100, cx: 150, cy: 150 };
    const b = getObjBounds(obj);
    expect(b.x + b.w).toBeGreaterThanOrEqual(150);
    expect(b.y + b.h).toBeGreaterThanOrEqual(150);
  });
});

// --- boxesIntersect ---
describe('boxesIntersect', () => {
  it('returns true for overlapping boxes', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    expect(boxesIntersect(a, b)).toBe(true);
  });

  it('returns false for non-overlapping boxes', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 20, y: 20, w: 10, h: 10 };
    expect(boxesIntersect(a, b)).toBe(false);
  });

  it('returns false for boxes that just touch edges', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 10, y: 0, w: 10, h: 10 };
    expect(boxesIntersect(a, b)).toBe(false);
  });

  it('returns true when one box contains the other', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    const b = { x: 10, y: 10, w: 5, h: 5 };
    expect(boxesIntersect(a, b)).toBe(true);
  });
});

// --- getAnchorNames ---
describe('getAnchorNames', () => {
  it('returns 5 anchors for star shape', () => {
    const obj = { type: 'shape', shapeType: 'star' };
    expect(getAnchorNames(obj)).toHaveLength(5);
  });

  it('returns 6 anchors for hexagon shape', () => {
    const obj = { type: 'shape', shapeType: 'hexagon' };
    expect(getAnchorNames(obj)).toHaveLength(6);
  });

  it('returns 3 anchors for triangle shape', () => {
    const obj = { type: 'shape', shapeType: 'triangle' };
    expect(getAnchorNames(obj)).toHaveLength(3);
  });

  it('returns 4 anchors for diamond shape', () => {
    const obj = { type: 'shape', shapeType: 'diamond' };
    expect(getAnchorNames(obj)).toHaveLength(4);
  });

  it('returns 4 default anchors (top/right/bottom/left) for rectangle', () => {
    const obj = { type: 'shape', shapeType: 'rectangle' };
    const anchors = getAnchorNames(obj);
    expect(anchors).toEqual(['top', 'right', 'bottom', 'left']);
  });

  it('returns default anchors for sticky notes', () => {
    const obj = { type: 'stickyNote' };
    expect(getAnchorNames(obj)).toEqual(['top', 'right', 'bottom', 'left']);
  });
});

// --- getAnchorPoint ---
describe('getAnchorPoint', () => {
  const rect = { x: 0, y: 0, width: 100, height: 100 };

  it('returns top center for "top" anchor', () => {
    const pt = getAnchorPoint(rect, 'top');
    expect(pt.x).toBeCloseTo(50);
    expect(pt.y).toBeCloseTo(0);
  });

  it('returns right center for "right" anchor', () => {
    const pt = getAnchorPoint(rect, 'right');
    expect(pt.x).toBeCloseTo(100);
    expect(pt.y).toBeCloseTo(50);
  });

  it('returns bottom center for "bottom" anchor', () => {
    const pt = getAnchorPoint(rect, 'bottom');
    expect(pt.x).toBeCloseTo(50);
    expect(pt.y).toBeCloseTo(100);
  });

  it('returns left center for "left" anchor', () => {
    const pt = getAnchorPoint(rect, 'left');
    expect(pt.x).toBeCloseTo(0);
    expect(pt.y).toBeCloseTo(50);
  });

  it('returns center for unknown anchor name', () => {
    const pt = getAnchorPoint(rect, 'unknown');
    expect(pt.x).toBeCloseTo(50);
    expect(pt.y).toBeCloseTo(50);
  });

  it('applies rotation to anchor points', () => {
    const rotated = { x: 0, y: 0, width: 100, height: 100, rotation: 90 };
    const pt = getAnchorPoint(rotated, 'top');
    // After 90° rotation around center (50,50), top (50,0) → (100,50)
    expect(pt.x).toBeCloseTo(100);
    expect(pt.y).toBeCloseTo(50);
  });

  it('returns star tip positions for star anchors', () => {
    const star = { type: 'shape', shapeType: 'star', x: 0, y: 0, width: 100, height: 100 };
    const pt = getAnchorPoint(star, 'star0');
    // star0 is the topmost tip
    expect(pt.y).toBeLessThan(50);
  });
});

// --- getNearestAnchor ---
describe('getNearestAnchor', () => {
  const rect = { x: 0, y: 0, width: 100, height: 100 };

  it('picks "top" when point is above the object', () => {
    expect(getNearestAnchor(rect, 50, -50)).toBe('top');
  });

  it('picks "right" when point is to the right', () => {
    expect(getNearestAnchor(rect, 200, 50)).toBe('right');
  });

  it('picks "bottom" when point is below', () => {
    expect(getNearestAnchor(rect, 50, 200)).toBe('bottom');
  });

  it('picks "left" when point is to the left', () => {
    expect(getNearestAnchor(rect, -50, 50)).toBe('left');
  });
});

// --- getConnectorEndpoints ---
describe('getConnectorEndpoints', () => {
  it('uses explicit anchors when provided', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 };
    const to = { x: 200, y: 0, width: 100, height: 100 };
    const result = getConnectorEndpoints(from, to, 'right', 'left');
    expect(result.x1).toBeCloseTo(100);
    expect(result.y1).toBeCloseTo(50);
    expect(result.x2).toBeCloseTo(200);
    expect(result.y2).toBeCloseTo(50);
  });

  it('auto-picks horizontal anchors when objects are side by side', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 };
    const to = { x: 300, y: 0, width: 100, height: 100 };
    const result = getConnectorEndpoints(from, to);
    expect(result.resolvedFromAnchor).toBe('right');
    expect(result.resolvedToAnchor).toBe('left');
  });

  it('auto-picks vertical anchors when objects are stacked', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 };
    const to = { x: 0, y: 300, width: 100, height: 100 };
    const result = getConnectorEndpoints(from, to);
    expect(result.resolvedFromAnchor).toBe('bottom');
    expect(result.resolvedToAnchor).toBe('top');
  });

  it('uses nearest vertex for star shapes', () => {
    const from = { type: 'shape', shapeType: 'star', x: 0, y: 0, width: 100, height: 100 };
    const to = { x: 300, y: 0, width: 100, height: 100 };
    const result = getConnectorEndpoints(from, to);
    expect(result.resolvedFromAnchor).toMatch(/^star/);
  });
});

// --- computeCurvedConnectorPath ---
describe('computeCurvedConnectorPath', () => {
  it('returns a valid SVG path string', () => {
    const path = computeCurvedConnectorPath(0, 0, 200, 200, 'right', 'left');
    expect(path).toMatch(/^M /);
    expect(path).toContain('C ');
  });

  it('starts at the from point', () => {
    const path = computeCurvedConnectorPath(10, 20, 200, 200, 'right', 'left');
    expect(path.startsWith('M 10 20')).toBe(true);
  });

  it('ends at the to point', () => {
    const path = computeCurvedConnectorPath(0, 0, 150, 250, 'right', 'left');
    expect(path.endsWith('150 250')).toBe(true);
  });

  it('generates larger control point offsets for longer distances', () => {
    const short = computeCurvedConnectorPath(0, 0, 50, 0, 'right', 'left');
    const long = computeCurvedConnectorPath(0, 0, 500, 0, 'right', 'left');
    // Extract first control point x from "C cp1x cp1y, cp2x cp2y, x2 y2"
    const getCp1x = (p) => parseFloat(p.split('C ')[1].split(' ')[0]);
    expect(getCp1x(long)).toBeGreaterThan(getCp1x(short));
  });
});
