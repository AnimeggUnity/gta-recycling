import { describe, expect, it } from 'vitest';
import { PotholeSystem } from '../src/game/PotholeSystem';

describe('PotholeSystem', () => {
  it('emits one impact when entering a pothole', () => {
    const system = new PotholeSystem([{ id: 'a', x: 10, y: 10, radius: 5, severity: 0.8 }]);
    expect(system.update(10, 10, 180)).toBeCloseTo(0.8);
    expect(system.update(10, 10, 180)).toBe(0);
    system.update(30, 30, 180);
    expect(system.update(10, 10, 90)).toBeCloseTo(0.4);
  });
});
