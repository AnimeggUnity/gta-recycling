import type { VehicleTelemetry } from './Vehicle';

export type CrewReaction = 'calm' | 'annoyed' | 'angry' | 'furious';
export type CrewRiskContext = Readonly<{
  steeringInput?: number;
  residentDelaySeconds?: number;
}>;

export class CrewDynamics {
  public anger = 0;
  public swayForward = 0;
  public swayLateral = 0;
  public bounce = 0;
  public irritationCause = '狀態平穩';

  public get efficiency(): number {
    return Math.max(0.55, 1 - this.anger * 0.0045);
  }

  public get reaction(): CrewReaction {
    if (this.anger >= 75) return 'furious';
    if (this.anger >= 50) return 'angry';
    if (this.anger >= 25) return 'annoyed';
    return 'calm';
  }

  public update(telemetry: VehicleTelemetry, potholeImpact: number, dt: number, context: CrewRiskContext = {}): void {
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
    const roughRideRate = harshLongitudinal * 5 + harshLateral * 5.5 + harshJerk * 1.8;
    const speedKmh = telemetry.speed * 0.35;
    const speedingRate = speedKmh > 40 ? 2 + (speedKmh - 40) * 0.16 : 0;
    const fastTurnRate = Math.abs(context.steeringInput ?? 0) > 0.15 && speedKmh > 20
      ? 2.5 + (speedKmh - 20) * 0.18
      : 0;
    const residentDelay = context.residentDelaySeconds ?? 0;
    const residentDelayRate = residentDelay > 0 ? 2.5 + Math.min(2, residentDelay * 0.5) : 0;
    const irritationRate = roughRideRate + speedingRate + fastTurnRate + residentDelayRate;

    const causes = [
      { label: '車速超過 40 km/h', rate: speedingRate },
      { label: '過彎未降至 20 km/h', rate: fastTurnRate },
      { label: '居民拖延交付', rate: residentDelayRate },
      { label: '急煞或車身衝擊', rate: roughRideRate },
    ];
    this.irritationCause = potholeImpact > 0
      ? '坑洞衝擊'
      : causes.reduce((strongest, cause) => cause.rate > strongest.rate ? cause : strongest, { label: '狀態平穩', rate: 0 }).label;

    if (irritationRate > 0.05) this.anger += irritationRate * dt;
    else this.anger -= (telemetry.speed < 8 ? 0.5 : 0.12) * dt;
    this.anger = this.clamp(this.anger, 0, 100);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
