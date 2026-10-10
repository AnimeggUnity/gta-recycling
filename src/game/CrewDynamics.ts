import type { VehicleTelemetry } from './Vehicle';

export type CrewReaction = 'calm' | 'annoyed' | 'angry' | 'furious';

export class CrewDynamics {
  public anger = 0;
  public swayForward = 0;
  public swayLateral = 0;
  public bounce = 0;

  public get efficiency(): number {
    return Math.max(0.55, 1 - this.anger * 0.0045);
  }

  public get reaction(): CrewReaction {
    if (this.anger >= 75) return 'furious';
    if (this.anger >= 50) return 'angry';
    if (this.anger >= 25) return 'annoyed';
    return 'calm';
  }

  public update(telemetry: VehicleTelemetry, potholeImpact: number, dt: number): void {
    const targetForward = this.clamp(-telemetry.acceleration / 420, -1, 1);
    const targetLateral = this.clamp(-telemetry.lateralAcceleration / 220, -1, 1);
    const response = 1 - Math.exp(-8 * dt);
    this.swayForward += (targetForward - this.swayForward) * response;
    this.swayLateral += (targetLateral - this.swayLateral) * response;

    if (potholeImpact > 0) {
      this.bounce = Math.max(this.bounce, potholeImpact);
      this.anger += potholeImpact * 12;
    }
    this.bounce *= Math.exp(-5.5 * dt);

    const harshLongitudinal = Math.max(0, (Math.abs(telemetry.acceleration) - 240) / 260);
    const harshLateral = Math.max(0, (Math.abs(telemetry.lateralAcceleration) - 100) / 180);
    const harshJerk = telemetry.speed > 20 ? Math.max(0, (Math.abs(telemetry.jerk) - 8000) / 12000) : 0;
    const irritationRate = harshLongitudinal * 3.5 + harshLateral * 4 + harshJerk * 1.2;

    if (irritationRate > 0.05) this.anger += irritationRate * dt;
    else this.anger -= (telemetry.speed < 8 ? 0.5 : 0.12) * dt;
    this.anger = this.clamp(this.anger, 0, 100);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
