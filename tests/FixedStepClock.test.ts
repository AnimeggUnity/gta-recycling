import { describe, expect, it } from 'vitest';
import { FixedStepClock } from '../src/game/FixedStepClock';

describe('FixedStepClock', () => {
  it('advances simulation in consistent 60Hz steps', () => {
    const clock = new FixedStepClock();
    let steps = 0;
    clock.advance(1 / 30, () => { steps += 1; });
    expect(steps).toBe(2);
  });
});
