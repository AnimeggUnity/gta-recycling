import { describe, expect, it } from 'vitest';
import { CargoHold } from '../src/game/CargoHold';
import { SortingQueue } from '../src/game/SortingQueue';
import { SORTING_ITEMS, SORTING_BATCHES } from '../src/config/sorting';

const bottle = 'pet-bottle-tall-ribbed', tissue = 'used-tissue-soft-wad';
describe('manual sorting', () => {
  it('uses all 25 unique sample silhouettes with three items per resident', () => {
    const batches = SORTING_BATCHES.flat();
    expect(batches).toHaveLength(10);
    expect(batches.every((batch) => batch.length === 3)).toBe(true);
    expect(new Set(batches.flat()).size).toBe(25);
    expect(Object.keys(SORTING_ITEMS)).toHaveLength(25);
  });
  it('gives duplicate pictures independent IDs and accepts each only once', () => {
    const cargo = new CargoHold(), queue = new SortingQueue(cargo);
    queue.deliver([bottle, bottle]);
    const [first, second] = queue.pending;
    expect(first.instanceId).not.toBe(second.instanceId);
    expect(queue.place(first.instanceId, 'plastic')).toBe('accepted');
    expect(queue.place(first.instanceId, 'plastic')).toBe('missing');
    expect(queue.pending).toHaveLength(1);
    expect(cargo.volume).toBe(3);
  });
  it('keeps wrong drops and does not change capacity', () => {
    const cargo = new CargoHold(), queue = new SortingQueue(cargo);
    queue.deliver([bottle]);
    expect(queue.place(queue.pending[0].instanceId, 'paper')).toBe('wrong');
    expect(queue.place(queue.pending[0].instanceId, 'reject')).toBe('wrong');
    expect(queue.pending).toHaveLength(1);
    expect(queue.mistakes).toBe(2);
    expect(cargo.volume).toBe(0);
  });
  it('returns tissue without loading it into the truck', () => {
    const cargo = new CargoHold(), queue = new SortingQueue(cargo);
    queue.deliver([tissue]);
    expect(queue.place(queue.pending[0].instanceId, 'paper')).toBe('wrong');
    expect(queue.place(queue.pending[0].instanceId, 'reject')).toBe('returned');
    expect(queue.returned).toBe(1);
    expect(cargo.volume).toBe(0);
  });
  it('allows a capacity-blocked recyclable to be returned instead of deadlocking', () => {
    const cargo = new CargoHold(2, 2), queue = new SortingQueue(cargo);
    queue.deliver([bottle]);
    expect(queue.place(queue.pending[0].instanceId, 'plastic')).toBe('full');
    expect(queue.place(queue.pending[0].instanceId, 'reject')).toBe('returned');
    expect(queue.pending).toHaveLength(0);
  });
  it('checks weight as well as volume', () => {
    const queue = new SortingQueue(new CargoHold(100, 1));
    queue.deliver(['metal-can-standard-soda']);
    expect(queue.place(queue.pending[0].instanceId, 'metal')).toBe('full');
  });
  it('keeps paper containers separate in the UI but aggregates their paper cargo', () => {
    const cargo = new CargoHold(), queue = new SortingQueue(cargo);
    queue.deliver(['paper-meal-box-round-bowl']);
    const id = queue.pending[0].instanceId;
    expect(queue.place(id, 'paper')).toBe('wrong');
    expect(queue.place(id, 'paper-container')).toBe('accepted');
    expect(cargo.counts.paper).toBe(1);
  });
  it('rejects unknown assets before adding a partial batch', () => {
    const queue = new SortingQueue(new CargoHold());
    expect(() => queue.deliver([bottle, 'not-real'])).toThrow();
    expect(queue.pending).toHaveLength(0);
  });
});
