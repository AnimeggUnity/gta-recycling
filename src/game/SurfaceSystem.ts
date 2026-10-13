import { isBayPaved } from './CollectionBay';
import { SIDEWALK, STREET, VEHICLE } from '../config/balance';

type SurfaceVehicle = Readonly<{ x: number; y: number; rotation: number; speed: number }>;
type CollectionBay = Readonly<{ stop: Readonly<{ x: number; y: number }> }>;
export type SurfaceFeedback = Readonly<{
  onSidewalk: boolean;
  moving: boolean;
  curbImpact: number;
  bumpImpact: number;
  angerRate: number;
}>;

/** Wheel contact follows route coordinates and the same paved bays as StreetArt. */
export class SurfaceSystem {
  private wasOnSidewalk = false;
  private distanceSinceBump = 0;

  public constructor(private readonly bays: readonly CollectionBay[]) {}

  public update(vehicle: SurfaceVehicle, dt: number): SurfaceFeedback {
    const cos = Math.cos(vehicle.rotation), sin = Math.sin(vehicle.rotation);
    const onSidewalk = SIDEWALK.wheelOffsets.some(wheel => this.isSidewalk(
      vehicle.x + wheel.x * cos - wheel.y * sin,
      vehicle.y + wheel.x * sin + wheel.y * cos,
    ));
    const moving = onSidewalk && vehicle.speed > SIDEWALK.minimumMovingSpeed;
    let curbImpact = 0, bumpImpact = 0;
    if (moving && !this.wasOnSidewalk) {
      curbImpact = Math.max(SIDEWALK.minimumCurbImpact, Math.min(1, vehicle.speed / SIDEWALK.impactReferenceSpeed));
    }
    if (moving) {
      this.distanceSinceBump += vehicle.speed * dt;
      if (this.distanceSinceBump >= SIDEWALK.bumpSpacing) {
        this.distanceSinceBump %= SIDEWALK.bumpSpacing;
        bumpImpact = Math.min(SIDEWALK.maximumBumpImpact, SIDEWALK.minimumBumpImpact + vehicle.speed / SIDEWALK.impactReferenceSpeed * SIDEWALK.bumpSpeedGain);
      }
    } else if (!onSidewalk) {
      this.distanceSinceBump = 0;
    }
    this.wasOnSidewalk = onSidewalk;
    return {
      onSidewalk, moving, curbImpact, bumpImpact,
      angerRate: moving ? SIDEWALK.angerPerSecond + vehicle.speed * VEHICLE.kmhPerSpeedUnit * SIDEWALK.angerPerKmh : 0,
    };
  }

  private isSidewalk(x: number, y: number): boolean {
    const onWalk = y >= STREET.sidewalkTop && y < STREET.top || y > STREET.bottom && y <= STREET.sidewalkBottom;
    if (!onWalk) return false;
    // Every bay is paved from the roadway to the far yellow boundary; not just its stop center.
    return !this.bays.some(bay => isBayPaved(bay.stop, x, y));
  }
}
