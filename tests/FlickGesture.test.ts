import { describe, expect, it } from 'vitest';
import { FlickGesture } from '../src/ui/FlickGesture';

describe('flick gesture velocity', () => {
  it.each([15, 30, 45])('preserves velocity during a %sms lift pause', pause => {
    const g = new FlickGesture();
    g.begin(0.5, 0.85, 0); g.move(0.5, 0.45, 100);
    const velocity = g.release(0.5, 0.45, 100 + pause)!;
    expect(velocity.vx).toBe(0); expect(velocity.vy).toBeCloseTo(-4);
  });
  it('includes a lift pause longer than the tolerance', () => {
    const g = new FlickGesture();
    g.begin(0.5, 0.85, 0); g.move(0.5, 0.45, 100);
    expect(g.release(0.5, 0.45, 146)?.vy).toBeCloseTo(-0.4 / 0.146);
  });
  it('uses movement near release after a long hold', () => {
    const g = new FlickGesture();
    g.begin(0.5, 0.85, 0); g.move(0.5, 0.85, 1000);
    g.move(0.5, 0.75, 1050); g.move(0.5, 0.65, 1100);
    const velocity = g.release(0.5, 0.65, 1100)!;
    expect(velocity.vx).toBe(0); expect(velocity.vy).toBeCloseTo(-2);
  });
  it('measures both swipe direction and elapsed time', () => {
    const slow = new FlickGesture(), fast = new FlickGesture();
    slow.begin(0.5, 0.85, 0); fast.begin(0.5, 0.85, 0);
    const a = slow.release(0.6, 0.45, 200)!, b = fast.release(0.6, 0.45, 100)!;
    expect(b.vy).toBeCloseTo(a.vy * 2); expect(b.vx).toBeGreaterThan(0);
  });
  it('does not consume taps or a canceled gesture', () => {
    const g = new FlickGesture();
    g.begin(0.5, 0.85, 0); expect(g.release(0.51, 0.85, 100)).toBeUndefined();
    g.begin(0.5, 0.85, 0); g.move(0.5, 0.3, 100); g.cancel();
    expect(g.release(0.5, 0.3, 110)).toBeUndefined();
  });
  it('removes momentum if the player pauses before releasing', () => {
    const g = new FlickGesture();
    g.begin(0.5, 0.85, 0); g.move(0.5, 0.45, 100);
    expect(g.release(0.5, 0.45, 400)).toEqual({ vx: 0, vy: 0 });
  });
});
