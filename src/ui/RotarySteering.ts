import { TOUCH_STEERING } from '../config/balance';

/** Screen coordinates: clockwise is positive/right. Down position is only an anchor. */
export class RotarySteering {
  public degrees = 0;
  private previousAngle?: number;
  private centerRadius = 0;
  private previousPoint?: Readonly<{ x: number; y: number }>;

  public begin(x: number, y: number, diameter: number): void {
    this.degrees = 0;
    this.centerRadius = diameter * TOUCH_STEERING.centerRadiusRatio;
    this.previousAngle = this.angle(x, y);
    this.previousPoint = this.previousAngle === undefined ? undefined : { x, y };
  }

  public move(x: number, y: number): number {
    const angle = this.angle(x, y);
    if (angle !== undefined && this.previousAngle !== undefined && !this.crossesCenter(x, y)) {
      const difference = angle - this.previousAngle;
      const delta = Math.atan2(Math.sin(difference), Math.cos(difference)) * 180 / Math.PI;
      this.degrees = Math.max(-TOUCH_STEERING.maximumAngleDegrees, Math.min(TOUCH_STEERING.maximumAngleDegrees, this.degrees + delta));
    }
    // Exiting the unreliable center re-anchors without adding a sudden angle.
    this.previousAngle = angle;
    this.previousPoint = angle === undefined ? undefined : { x, y };
    const amount = Math.max(0, Math.abs(this.degrees) - TOUCH_STEERING.deadAngleDegrees)
      / (TOUCH_STEERING.maximumAngleDegrees - TOUCH_STEERING.deadAngleDegrees);
    return amount === 0 ? 0 : Math.sign(this.degrees) * amount ** TOUCH_STEERING.responseExponent;
  }

  public reset(): void { this.degrees = 0; this.previousAngle = undefined; this.previousPoint = undefined; }

  private crossesCenter(x: number, y: number): boolean {
    if (!this.previousPoint) return false;
    const previous = this.previousPoint;
    const dx = x - previous.x, dy = y - previous.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return false;
    const t = Math.max(0, Math.min(1, -(previous.x * dx + previous.y * dy) / lengthSquared));
    return Math.hypot(previous.x + t * dx, previous.y + t * dy) < this.centerRadius;
  }

  private angle(x: number, y: number): number | undefined {
    return Math.hypot(x, y) < this.centerRadius ? undefined : Math.atan2(y, x);
  }
}
