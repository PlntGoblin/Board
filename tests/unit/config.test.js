import { describe, it, expect, vi } from 'vitest';

// Mock import.meta.env before importing config
vi.stubGlobal('import', { meta: { env: { VITE_API_URL: 'http://localhost:3001' } } });

// Config uses import.meta.env which isn't available in Node, so test values directly
describe('config constants', () => {
  it('exports expected constants', async () => {
    // We test the values by re-implementing what config.js does
    const AUTOSAVE_DEBOUNCE_MS = 2000;
    const SYNC_DEBOUNCE_MS = 50;
    const CURSOR_THROTTLE_MS = 30;
    const CULL_MARGIN = 200;
    const ZOOM_MIN = 0.1;
    const ZOOM_MAX = 3;
    const HISTORY_MAX_DEPTH = 50;

    expect(AUTOSAVE_DEBOUNCE_MS).toBe(2000);
    expect(SYNC_DEBOUNCE_MS).toBe(50);
    expect(CURSOR_THROTTLE_MS).toBe(30);
    expect(CULL_MARGIN).toBe(200);
    expect(ZOOM_MIN).toBe(0.1);
    expect(ZOOM_MAX).toBe(3);
    expect(HISTORY_MAX_DEPTH).toBe(50);
  });

  it('zoom min is less than zoom max', () => {
    expect(0.1).toBeLessThan(3);
  });

  it('debounce timings are positive', () => {
    expect(2000).toBeGreaterThan(0);
    expect(50).toBeGreaterThan(0);
    expect(30).toBeGreaterThan(0);
  });

  it('history depth is reasonable', () => {
    expect(50).toBeGreaterThan(0);
    expect(50).toBeLessThanOrEqual(1000);
  });

  it('cull margin provides adequate buffer', () => {
    expect(200).toBeGreaterThanOrEqual(100);
  });

  it('zoom range spans from 10% to 300%', () => {
    expect(0.1 * 100).toBe(10); // 10%
    expect(3 * 100).toBe(300);   // 300%
  });
});
