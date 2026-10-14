import { describe, expect, it } from 'vitest';
import { HornInput } from '../src/ui/HornInput';
import { TouchInputState } from '../src/ui/TouchInputState';

describe('one-shot horn input', () => {
  it('coalesces requests and consumes them once', () => {
    const horn = new HornInput(); horn.request(); horn.request();
    expect(horn.take()).toBe(true); expect(horn.take()).toBe(false);
    horn.request(); horn.reset(); expect(horn.take()).toBe(false);
  });
  it('does not release or change held gas and steering fingers', () => {
    const horn = new HornInput(), driving = new TouchInputState();
    driving.press(1, 'forward'); driving.press(2, 'steering'); driving.steer(2, -0.8);
    horn.request(); expect(horn.take()).toBe(true);
    expect(driving.read()).toEqual({ throttle: 1, steering: -0.8, brake: false });
    driving.steer(2, 0.8); driving.release(2);
    expect(driving.read()).toEqual({ throttle: 1, steering: 0, brake: false });
  });
});
