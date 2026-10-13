import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { drawCargoPile, RECYCLING_COLORS } from '../src/scenes/TruckArt';

function graphics() {
  const g = { clear: vi.fn(), fillStyle: vi.fn(), lineStyle: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn() };
  for (const method of Object.values(g)) method.mockReturnValue(g);
  return g;
}

describe('map cargo stays inside the truck bed', () => {
  it.each([1, 8, 12, 24, 60, 10000])('keeps every painted rectangle inside the actual bed for %i items', total => {
    const g = graphics();
    const counts = { paper: Math.ceil(total / 4), plastic: Math.floor(total / 4), metal: Math.floor(total / 4), glass: total - Math.ceil(total / 4) - 2 * Math.floor(total / 4) };
    const original = { ...counts };
    drawCargoPile(g as unknown as Phaser.GameObjects.Graphics, counts);
    for (const [x, y, width, height] of g.fillRect.mock.calls) {
      // Interior painted by drawTruckBody: x -88..-14, y -23..23.
      expect(x).toBeGreaterThanOrEqual(-88); expect(y).toBeGreaterThanOrEqual(-23);
      expect(x + width).toBeLessThanOrEqual(-14); expect(y + height).toBeLessThanOrEqual(23);
    }
    for (const [x, y, width, height] of g.strokeRect.mock.calls) {
      expect(x - 0.5).toBeGreaterThanOrEqual(-88); expect(y - 0.5).toBeGreaterThanOrEqual(-23);
      expect(x + width + 0.5).toBeLessThanOrEqual(-14); expect(y + height + 0.5).toBeLessThanOrEqual(23);
    }
    expect(g.fillRect.mock.calls.length).toBeLessThanOrEqual(36);
    expect(counts).toEqual(original);
  });
  it('keeps mixed materials visible at a full load', () => {
    const g = graphics();
    drawCargoPile(g as unknown as Phaser.GameObjects.Graphics, { paper: 15, plastic: 15, metal: 15, glass: 15 });
    for (const color of Object.values(RECYCLING_COLORS)) expect(g.fillStyle).toHaveBeenCalledWith(color);
  });
  it('clears old artwork when no cargo remains', () => {
    const g = graphics();
    drawCargoPile(g as unknown as Phaser.GameObjects.Graphics, { paper: 0, plastic: 0, metal: 0, glass: 0 });
    expect(g.clear).toHaveBeenCalledOnce(); expect(g.fillRect).not.toHaveBeenCalled();
  });
});
