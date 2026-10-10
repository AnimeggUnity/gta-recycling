import { describe, expect, it } from 'vitest';
import { CargoHold } from '../src/game/CargoHold';

describe('CargoHold', () => {
  it('tracks classified weight and volume', () => {
    const cargo = new CargoHold(20, 20);
    expect(cargo.add({ type: 'paper', volume: 8, weight: 3 })).toBe(true);
    expect(cargo.volume).toBe(8);
    expect(cargo.weight).toBe(3);
    expect(cargo.counts.paper).toBe(1);
  });

  it('rejects an item that would exceed capacity', () => {
    const cargo = new CargoHold(10, 10);
    expect(cargo.add({ type: 'glass', volume: 11, weight: 4 })).toBe(false);
    expect(cargo.volume).toBe(0);
  });
});
