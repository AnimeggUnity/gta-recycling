import { TOSS } from '../config/balance';
import type { TossGesture } from '../game/TossQueue';

type Point = { x: number; y: number; time: number };
/** Recent movement determines release speed; taps/cancel do not consume a bag. */
export class FlickGesture {
  private points: Point[] = [];
  private origin?: Point;
  public begin(x: number, y: number, time: number): void {
    this.origin = { x, y, time }; this.points = [this.origin];
  }
  public move(x: number, y: number, time: number): void {
    if (!this.origin) return;
    this.points.push({ x, y, time });
    const cutoff = time - TOSS.sampleWindowMs;
    // Retain a point at/before the cutoff for sparse event streams.
    while (this.points.length > 2 && this.points[1].time <= cutoff) this.points.shift();
  }
  public velocity(): TossGesture {
    const end = this.points.at(-1), start = this.points[0];
    if (!end || !start || end.time <= start.time) return { vx: 0, vy: 0 };
    const elapsed = Math.max(TOSS.minSampleMs, end.time - start.time) / 1000;
    return { vx: (end.x - start.x) / elapsed, vy: (end.y - start.y) / elapsed };
  }
  public release(x: number, y: number, time: number): TossGesture | undefined {
    if (!this.origin) return;
    this.move(x, y, time);
    const moved = Math.hypot(x - this.origin.x, y - this.origin.y) >= TOSS.minGestureDistance;
    const gesture = this.velocity();
    this.cancel();
    return moved ? gesture : undefined;
  }
  public cancel(): void { this.origin = undefined; this.points = []; }
}
