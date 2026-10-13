import { AUTOPILOT, STREET, TRAFFIC, VEHICLE } from '../config/balance';
import { bayBounds, bayGuideY, type BayStop } from './CollectionBay';
import { truckBody, type CollisionBody, type CollisionObstacle } from './CollisionWorld';
import type { StationCycle } from './StationCycle';
import { signalColor, TRAFFIC_SIGNALS } from './TrafficSystem';
import type { Vehicle, DriverInput } from './Vehicle';

type Observation = Readonly<{
  vehicle: Vehicle;
  cycle?: StationCycle;
  obstacles: readonly CollisionObstacle[];
  trafficSeconds: number;
  ended: boolean;
}>;

/** Emits the same driving inputs as a player, once per fixed physics step. */
export class Autopilot {
  public paused = false;
  public status = '自動行駛中';
  private departingStop?: BayStop;
  private mergeGranted = false;
  private entranceGrantedStop?: BayStop;
  public merging?: CollisionBody;

  public togglePause(): void { this.paused = !this.paused; }

  public read({ vehicle, cycle, obstacles, trafficSeconds, ended }: Observation): DriverInput {
    const hold = (status: string): DriverInput => {
      this.status = status;
      return this.speedInput(vehicle, 0, 0);
    };
    if (ended) return hold('收運結束');
    if (this.paused) return hold('已暫停行駛');
    if (cycle?.departureLocked) { this.merging = undefined; return hold(cycle.getStatusText()); }
    if ((cycle?.phase === 'ready' || cycle?.phase === 'departed') && this.departingStop !== cycle.definition.stop) {
      this.departingStop = cycle.definition.stop;
      this.mergeGranted = false;
    }
    if (this.departingStop && vehicle.x > bayBounds(this.departingStop).right + AUTOPILOT.exitClearance) { this.departingStop = undefined; this.mergeGranted = false; this.merging = undefined; }
    const stop = this.departingStop ?? cycle?.definition.stop;
    if (!stop) return hold('等待收運路線');
    const departing = Boolean(this.departingStop);
    const bounds = bayBounds(stop);
    const guide = (x: number) => bayGuideY(stop, departing ? x : Math.min(x, stop.x));
    const lookAhead = AUTOPILOT.lookAhead;
    const targetX = vehicle.x + lookAhead;
    const targetY = guide(targetX);
    const dx = targetX - vehicle.x, dy = targetY - vehicle.y;
    const alpha = Math.atan2(dy, dx) - vehicle.rotation;
    const curvature = 2 * Math.sin(alpha) / Math.hypot(dx, dy);
    const speedRatio = Math.min(1, vehicle.speed * VEHICLE.kmhPerSpeedUnit / VEHICLE.steeringSpeedReferenceKmh);
    const maxAngle = VEHICLE.lowSpeedSteeringAngle + (VEHICLE.highSpeedSteeringAngle - VEHICLE.lowSpeedSteeringAngle) * speedRatio;
    const steering = Math.max(-1, Math.min(1, Math.atan(VEHICLE.wheelbase * curvature) / maxAngle));
    const inBay = vehicle.x > bounds.left - AUTOPILOT.curveApproach && vehicle.x < bounds.right + AUTOPILOT.exitClearance;
    let desiredSpeed = (inBay ? departing ? AUTOPILOT.exitSpeedKmh : AUTOPILOT.entrySpeedKmh : AUTOPILOT.cruiseSpeedKmh) / VEHICLE.kmhPerSpeedUnit;
    this.status = departing ? '正在離站' : inBay ? '正在停靠' : '自動行駛中';
    const limitForDistance = (distance: number, status: string) => {
      const safe = Math.min(Math.sqrt(2 * AUTOPILOT.braking * Math.max(0, distance)), Math.max(0, distance) / AUTOPILOT.stoppingSeconds);
      if (safe < desiredSpeed) { desiredSpeed = safe; this.status = status; }
    };
    if (!departing) limitForDistance(stop.x - vehicle.x, '正在停靠');

    if (!departing && this.entranceGrantedStop !== stop && vehicle.x > bounds.left - AUTOPILOT.curveApproach) {
      const adjacentBusy = obstacles.some(obstacle => obstacle.kind === 'vehicle'
        && obstacle.y < STREET.startY && obstacle.y > STREET.centerY
        && obstacle.x > vehicle.x - AUTOPILOT.entranceRearGap && obstacle.x < vehicle.x + AUTOPILOT.entranceFrontGap);
      if (adjacentBusy) limitForDistance(bounds.left - AUTOPILOT.entranceWaitOffset - vehicle.x, '等待鄰車，準備停靠');
      else this.entranceGrantedStop = stop;
    }
    const body = truckBody(vehicle);
    const frontX = body.x + body.halfLength;
    for (const signal of TRAFFIC_SIGNALS) {
      const gap = signal.x - TRAFFIC.stopLineOffset - AUTOPILOT.signalMargin - frontX;
      if (gap >= 0 && signalColor(signal, trafficSeconds) !== 'green') limitForDistance(gap, '等候紅綠燈');
    }
    for (const obstacle of obstacles) {
      const ahead = obstacle.x - vehicle.x;
      if (ahead <= 0 || ahead > AUTOPILOT.obstacleRange) continue;
      const pathY = guide(Math.min(obstacle.x, vehicle.x + AUTOPILOT.obstacleLookAhead));
      if (Math.min(Math.abs(obstacle.y - body.y), Math.abs(obstacle.y - pathY)) > body.halfWidth + obstacle.halfWidth + AUTOPILOT.lateralMargin) continue;
      const gap = obstacle.x - obstacle.halfLength - frontX - AUTOPILOT.followingGap;
      limitForDistance(gap, '等待前方車輛／障礙物');
    }
    // Yield while still fully outside the lane; passing vehicles can clear the bay.
    if (departing && !this.mergeGranted) {
      const mergeBusy = obstacles.some(obstacle => obstacle.kind === 'vehicle'
        && Math.abs(obstacle.y - STREET.startY) < TRAFFIC.truckHalfWidth + obstacle.halfWidth
        && obstacle.x > vehicle.x - AUTOPILOT.mergeRearGap && obstacle.x < vehicle.x + AUTOPILOT.mergeFrontGap);
      if (mergeBusy) limitForDistance(stop.x + AUTOPILOT.mergeWaitOffset - vehicle.x, '等待車流，準備離站');
      else this.mergeGranted = true;
    }
    const entranceYield = !departing && this.entranceGrantedStop === stop && vehicle.x < bounds.left + AUTOPILOT.entranceClearance;
    this.merging = departing && this.mergeGranted ? { ...body, y: STREET.startY, rotation: 0 }
      : entranceYield ? { ...body, y: STREET.eastboundLanes[0], rotation: 0 } : undefined;
    return this.speedInput(vehicle, desiredSpeed, steering);
  }

  private speedInput(vehicle: Vehicle, target: number, steering: number): DriverInput {
    const error = target - vehicle.speed;
    const acceleration = Math.max(-AUTOPILOT.braking, Math.min(AUTOPILOT.acceleration, error * AUTOPILOT.speedGain));
    return {
      steering,
      throttle: acceleration >= 0 ? acceleration / VEHICLE.forwardAcceleration : acceleration / VEHICLE.directionChangeBraking,
      brake: target < AUTOPILOT.standstillSpeed && vehicle.speed < AUTOPILOT.standstillSpeed,
    };
  }
}
