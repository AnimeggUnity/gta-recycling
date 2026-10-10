import { describe, expect, it } from 'vitest';
import { resolvePriorityAxis } from '../src/game/InputResolver';

describe('resolvePriorityAxis', () => {
  it('uses the most recently pressed direction when both are held', () => {
    expect(resolvePriorityAxis(
      [{ isDown: true, timeDown: 100 }],
      [{ isDown: true, timeDown: 150 }],
    )).toBe(1);
    expect(resolvePriorityAxis(
      [{ isDown: true, timeDown: 220 }],
      [{ isDown: true, timeDown: 150 }],
    )).toBe(-1);
  });

  it('supports multiple keys for the same direction', () => {
    expect(resolvePriorityAxis(
      [{ isDown: false, timeDown: 0 }, { isDown: true, timeDown: 300 }],
      [{ isDown: true, timeDown: 250 }],
    )).toBe(-1);
  });
});
