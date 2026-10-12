import { describe, expect, it } from 'vitest';
import { RotarySteering } from '../src/ui/RotarySteering';

const point = (degrees: number) => [50 * Math.cos(degrees * Math.PI / 180), 50 * Math.sin(degrees * Math.PI / 180)] as const;
describe('rotary touch steering', () => {
  it.each([0, 90, 180, -90])('starts neutral at touch-down angle %s', (degrees) => {
    const wheel = new RotarySteering();
    wheel.begin(...point(degrees), 124);
    expect(wheel.move(...point(degrees))).toBe(0);
    expect(wheel.degrees).toBe(0);
  });
  it('turns right clockwise and left counterclockwise even when grabbed on the left', () => {
    const wheel = new RotarySteering();
    wheel.begin(-50, 0, 124);
    expect(wheel.move(0, -50)).toBe(1);
    wheel.begin(-50, 0, 124);
    expect(wheel.move(0, 50)).toBe(-1);
  });
  it('ignores tiny angular jitter and makes small turns less sensitive than a linear control', () => {
    const wheel = new RotarySteering();
    wheel.begin(...point(0), 124);
    expect(wheel.move(...point(3))).toBe(0);
    expect(wheel.move(...point(-3))).toBe(0);
    const value = wheel.move(...point(30));
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(30 / 90);
  });
  it('unwraps the -180/180 seam rather than jumping to opposite full lock', () => {
    const wheel = new RotarySteering();
    wheel.begin(...point(175), 124);
    expect(wheel.move(...point(-175))).toBeGreaterThan(0);
    expect(wheel.degrees).toBeCloseTo(10);
    wheel.move(...point(175));
    expect(wheel.degrees).toBeCloseTo(0);
  });
  it('holds its angle inside the center and re-anchors on exit without jumping', () => {
    const wheel = new RotarySteering();
    wheel.begin(...point(0), 124);
    const value = wheel.move(...point(45));
    expect(wheel.move(0, 0)).toBe(value);
    expect(wheel.move(...point(-135))).toBe(value);
    expect(wheel.degrees).toBeCloseTo(45);
  });
  it('accepts a center grab only after the finger reaches a reliable radius', () => {
    const wheel = new RotarySteering();
    wheel.begin(0, 0, 124);
    expect(wheel.move(...point(90))).toBe(0);
    expect(wheel.move(...point(180))).toBe(1);
  });
  it('ignores a fast straight swipe across the center even if intermediate events are missing', () => {
    const wheel = new RotarySteering();
    wheel.begin(...point(0), 124);
    expect(wheel.move(...point(180))).toBe(0);
    expect(wheel.move(...point(210))).toBeGreaterThan(0);
    expect(wheel.degrees).toBeCloseTo(30);
  });
  it('has no full-lock windup, responds immediately when turning back, and resets neutral', () => {
    const wheel = new RotarySteering();
    wheel.begin(...point(0), 124);
    wheel.move(...point(90));wheel.move(...point(135));
    expect(wheel.degrees).toBe(90);
    wheel.move(...point(115));
    expect(wheel.degrees).toBeCloseTo(70);
    wheel.reset();
    expect(wheel.degrees).toBe(0);
    wheel.begin(...point(-90), 124);
    expect(wheel.move(...point(-90))).toBe(0);
  });
});
