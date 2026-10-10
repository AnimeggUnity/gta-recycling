export type PotholeDefinition = Readonly<{
  id: string;
  x: number;
  y: number;
  radius: number;
  severity: number;
}>;

export class PotholeSystem {
  private readonly occupied = new Set<string>();

  public constructor(public readonly potholes: readonly PotholeDefinition[]) {}

  public update(vehicleX: number, vehicleY: number, speed: number): number {
    let strongestImpact = 0;
    for (const pothole of this.potholes) {
      const inside = Math.hypot(vehicleX - pothole.x, vehicleY - pothole.y) <= pothole.radius;
      if (inside && !this.occupied.has(pothole.id)) {
        const speedFactor = this.clamp(speed / 180, 0.15, 1);
        strongestImpact = Math.max(strongestImpact, pothole.severity * speedFactor);
        this.occupied.add(pothole.id);
      } else if (!inside) {
        this.occupied.delete(pothole.id);
      }
    }
    return strongestImpact;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
