import { describe, expect, it } from 'vitest';
import { TouchInputState } from '../src/ui/TouchInputState';

const neutral = { throttle: 0, steering: 0, brake: false };

describe('multitouch driving state', () => {
  it('holds gas and steering independently, including left-to-right reversal', () => {
    const state = new TouchInputState();
    state.press(1, 'forward');
    state.press(2, 'steering');
    state.steer(2, -0.8);
    expect(state.read()).toEqual({ throttle: 1, steering: -0.8, brake: false });
    state.steer(2, 0.9);
    expect(state.read()).toEqual({ throttle: 1, steering: 0.9, brake: false });
    state.release(2);
    expect(state.read()).toEqual({ throttle: 1, steering: 0, brake: false });
  });
  it('does not release another finger pressing the same pedal', () => {
    const state = new TouchInputState();
    state.press(1, 'forward'); state.press(2, 'forward');
    state.release(1);
    expect(state.read().throttle).toBe(1);
  });
  it('prioritizes the latest opposing pedal and restores the older hold when released', () => {
    const state = new TouchInputState();
    state.press(1, 'forward'); state.press(2, 'reverse');
    expect(state.read().throttle).toBe(-1);
    state.release(2);
    expect(state.read().throttle).toBe(1);
  });
  it('brakes without dropping the held throttle and clamps steering', () => {
    const state = new TouchInputState();
    state.press(1, 'forward'); state.press(2, 'brake'); state.press(3, 'steering');
    state.steer(3, 10);
    expect(state.read()).toEqual({ throttle: 1, steering: 1, brake: true });
    state.steer(3, -10);
    expect(state.read().steering).toBe(-1);
  });
  it('resets every pointer so canceled touch cannot leave gas stuck on', () => {
    const state = new TouchInputState();
    state.press(1, 'forward'); state.press(2, 'brake'); state.reset();
    state.steer(9, 1);
    expect(state.read()).toEqual(neutral);
  });
  it('preserves keyboard axes not currently owned by a finger', () => {
    const state = new TouchInputState();
    const keys = { throttle: 1, steering: -1, brake: true };
    expect(state.merge(keys)).toEqual(keys);
    state.press(1, 'steering'); state.steer(1, 0.7);
    expect(state.merge(keys)).toEqual({ throttle: 1, steering: 0.7, brake: true });
  });
});
