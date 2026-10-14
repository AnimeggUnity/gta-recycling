import { describe, expect, it } from 'vitest';
import { TOSS } from '../src/config/balance';
import { TossQueue, type BagSize, type TossOutcome } from '../src/game/TossQueue';

function queue(size: BagSize) {
  const sizeValue = { small: 0, medium: 0.5, large: 0.99 }[size];
  let call = 0;
  return new TossQueue(() => call++ === 0 ? 0 : sizeValue);
}
function velocity(size: BagSize, launchSpeed = 1.8) {
  return -launchSpeed * Math.sqrt(TOSS.bagSizes[size].mass) / TOSS.speedGain;
}
function settle(q: TossQueue, dt = 1 / 60) { for (let i = 0; i < 300 && q.flight; i++) q.update(dt); }

describe('garbage throws', () => {
  it('preserves default random calls and draws hazards only after all sizes', () => {
    let calls = 0;
    const ordinary = new TossQueue(() => { calls++; return 0; });
    expect(calls).toBe(1 + ordinary.bags.length);
    const draws = [0, 0, 0.5, 0.99, 0, 0.9, 0.99];
    const hazards = new TossQueue(() => draws.shift()!, true);
    expect(hazards.bags).toEqual([{ id: 1, size: 'small' }, { id: 2, size: 'medium', hazard: 'lithium-battery' }, { id: 3, size: 'large' }]);
  });
  it.each(['swipe', 'button'])('returns a hazardous bag by %s without flight or duplicate credit', method => {
    const q = new TossQueue(() => 0, true);
    q.launch(1, { vx: 0, vy: velocity('small') }); settle(q);
    expect(q.current?.hazard).toBe('gas-canister');
    expect(method === 'swipe' ? q.launch(2, { vx: 0, vy: TOSS.rejectSwipeVelocityY }) : q.rejectCurrent(2)).toBe(true);
    expect(q.flight).toBeUndefined(); expect(q.returnedHazards).toBe(1);
    expect(q.lastOutcome).toBe('returned'); expect(q.stats.score).toBe(200);
    expect(q.rejectCurrent(2)).toBe(false); expect(q.returnedHazards).toBe(1);
  });
  it('penalizes a hazard hit once and never returns it for cargo loading', () => {
    const q = new TossQueue(() => 0, true);
    q.launch(1, { vx: 0, vy: velocity('small') }); settle(q);
    q.launch(2, { vx: 0, vy: velocity('small') });
    expect(q.rejectCurrent(2)).toBe(false);
    let loaded = 0;
    for (let i = 0; i < 180; i++) if (q.update(1 / 60)) loaded++;
    expect(loaded).toBe(0); expect(q.hazardExplosions).toBe(1);
    expect(q.lastOutcome).toBe('hazard-exploded');
    expect(q.stats).toEqual({ hits: 1, misses: 1, score: 0 });
    q.launch(3, { vx: 0, vy: velocity('small') }); settle(q);
    expect(q.stats.score).toBe(0); expect(q.hazardExplosions).toBe(2);
  });
  it('counts a hazardous miss as a miss without an explosion', () => {
    const q = new TossQueue(() => 0, true);
    q.rejectCurrent(1); q.launch(2, { vx: 0, vy: 0 }); settle(q);
    expect(q.hazardExplosions).toBe(0); expect(q.lastOutcome).toBe('short');
    expect(q.stats).toEqual({ hits: 0, misses: 2, score: 0 });
  });
  it.each([0, 0.4, 0.99])('draws 3–5 stable bags from random %s', random => {
    const q = new TossQueue(() => random);
    expect(q.bags.length).toBe(3 + Math.floor(random * 3));
    const bags = q.bags;
    for (let i = 0; i < 20; i++) q.update(1 / 60);
    expect(q.bags).toBe(bags);
  });
  it.each<BagSize>(['small', 'medium', 'large'])('accepts a calibrated %s bag once and only scores at the mouth', size => {
    const q = queue(size);
    expect(q.launch(99, { vx: 0, vy: velocity(size) })).toBe(false);
    expect(q.launch(q.current!.id, { vx: 0, vy: velocity(size) })).toBe(true);
    expect(q.hits).toBe(0);
    expect(q.launch(q.current!.id, { vx: 0, vy: velocity(size) })).toBe(false);
    settle(q);
    expect(q.stats).toEqual({ hits: 1, misses: 0, score: 100 });
    expect(q.processed).toBe(1);
  });
  it('needs more swipe speed for a large bag with identical direction', () => {
    const small = queue('small'), large = queue('large');
    for (const q of [small, large]) { q.launch(1, { vx: 0, vy: velocity('small') }); settle(q); }
    expect(small.lastOutcome).toBe('hit'); expect(large.lastOutcome).toBe('short');
  });
  it.each<{ vx: number; speed: number; expected: TossOutcome }>([
    { vx: 0, speed: 0.3, expected: 'short' },
    { vx: 0, speed: 3.5, expected: 'strong' },
    { vx: -1.4, speed: 1.8, expected: 'left' },
    { vx: 1.4, speed: 1.8, expected: 'right' },
  ])('consumes $expected throws without points', ({ vx, speed, expected }) => {
    const q = queue('medium'); q.launch(1, { vx, vy: velocity('medium', speed) }); settle(q);
    expect(q.stats).toEqual({ hits: 0, misses: 1, score: 0 });
    expect(q.lastOutcome).toBe(expected); expect(q.current?.id).toBe(2);
  });
  it('can finish a station with every throw missed', () => {
    const q = queue('large');
    while (!q.complete) { q.launch(q.current!.id, { vx: 0, vy: 0 }); settle(q); }
    expect(q.misses).toBe(q.bags.length); expect(q.stats.score).toBe(0);
    expect(q.current).toBeUndefined();
  });
  it('is independent of update frequency and rejects nonfinite input', () => {
    const a = queue('medium'), b = queue('medium');
    expect(a.launch(1, { vx: NaN, vy: -1 })).toBe(false);
    for (const q of [a, b]) q.launch(1, { vx: 0.1, vy: velocity('medium') });
    settle(a, 1 / 30); settle(b, 1 / 120);
    expect(a.stats).toEqual(b.stats); expect(a.lastOutcome).toBe(b.lastOutcome);
  });
});
