import { describe, expect, it } from 'vitest';
import { sortingScatter } from '../src/ui/SortingScatter';
import { SORTING_DROP_ZONES } from '../src/config/sortingLayout';
import { SORTING_ITEMS } from '../src/config/sorting';

describe('sorting artwork layout', () => {
  it('keeps stable, varied placements inside the basket after removing other items', () => {
    const first = sortingScatter(3);
    for (let id = 1; id <= 100; id++) {
      const position = sortingScatter(id);
      expect(position.x).toBeGreaterThanOrEqual(16);
      expect(position.x).toBeLessThanOrEqual(84);
      expect(position.y).toBeGreaterThanOrEqual(28);
      expect(position.y).toBeLessThanOrEqual(72);
      expect(position.rotation).toBeGreaterThanOrEqual(-40);
      expect(position.rotation).toBeLessThanOrEqual(40);
    }
    expect(sortingScatter(3)).toEqual(first);
    expect(sortingScatter(4)).not.toEqual(first);
    const floor = Array.from({ length: 12 }, (_, index) => sortingScatter(index + 1));
    expect(new Set(floor.map(item => `${Math.round((item.x - 18) / (64 / 3))},${Math.round((item.y - 30) / 20)}`)).size).toBe(12);
    expect(Math.max(...floor.map(item => item.x)) - Math.min(...floor.map(item => item.x))).toBeGreaterThan(60);
    expect(Math.max(...floor.map(item => item.y)) - Math.min(...floor.map(item => item.y))).toBeGreaterThan(36);
  });
  it('maps each sack to a representative item of its own category', () => {
    for (const [target, zone] of Object.entries(SORTING_DROP_ZONES)) {
      if (zone.icon) expect(SORTING_ITEMS[zone.icon].target).toBe(target);
      expect(zone.x + zone.width).toBeLessThanOrEqual(100);
      expect(zone.y + zone.height).toBeLessThanOrEqual(100);
    }
  });
  it('keeps drop regions separate and bags above the receiving basket', () => {
    const zones = Object.entries(SORTING_DROP_ZONES);
    for (let i = 0; i < zones.length; i++) {
      const [target, a] = zones[i];
      if (target !== 'reject') expect(a.y + a.height).toBeLessThan(65);
      for (const [, b] of zones.slice(i + 1)) {
        expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
      }
    }
  });
});
