import { STREET, TRAFFIC, WORLD } from '../config/balance';
import { intersectBodies, type CollisionBody, type CollisionObstacle } from './CollisionWorld';

export type SignalColor = 'green' | 'yellow' | 'red';
export type TrafficSignal = Readonly<{ id: string; x: number; offsetSeconds: number }>;
export type TrafficVehicle = {
  id: string; kind: 'car' | 'scooter'; x: number; y: number; direction: 1 | -1;
  speed: number; desiredSpeed: number; halfLength: number; halfWidth: number;
  color: number; yieldSeconds: number; previousX: number;
};

export const TRAFFIC_SIGNALS: readonly TrafficSignal[] = TRAFFIC.signalXs.map((x, index) => ({ id: `signal-${index}`, x, offsetSeconds: index * 11 }));

export function signalColor(signal: TrafficSignal, elapsedSeconds: number): SignalColor {
  const cycle = TRAFFIC.greenSeconds + TRAFFIC.yellowSeconds + TRAFFIC.redSeconds;
  const phase = ((elapsedSeconds + signal.offsetSeconds) % cycle + cycle) % cycle;
  return phase < TRAFFIC.greenSeconds ? 'green' : phase < TRAFFIC.greenSeconds + TRAFFIC.yellowSeconds ? 'yellow' : 'red';
}

export function trafficBody(vehicle: TrafficVehicle): CollisionBody {
  return { x: vehicle.x, y: vehicle.y, rotation: vehicle.direction > 0 ? 0 : Math.PI, halfLength: vehicle.halfLength, halfWidth: vehicle.halfWidth };
}

function bodyXExtent(body: CollisionBody): number {
  return Math.abs(Math.cos(body.rotation)) * body.halfLength + Math.abs(Math.sin(body.rotation)) * body.halfWidth;
}
function bodyYExtent(body: CollisionBody): number {
  return Math.abs(Math.sin(body.rotation)) * body.halfLength + Math.abs(Math.cos(body.rotation)) * body.halfWidth;
}

export class TrafficSystem {
  public elapsedSeconds = 0;
  public readonly vehicles: TrafficVehicle[];
  public constructor(vehicles?: TrafficVehicle[]) {
    this.vehicles = vehicles ?? [...STREET.eastboundLanes, ...STREET.westboundLanes].flatMap((y, lane) =>
      Array.from({ length: TRAFFIC.vehiclesPerLane }, (_, index): TrafficVehicle => {
        const kind = (index + lane) % 3 === 0 ? 'scooter' : 'car';
        const x = TRAFFIC.initialSpawnX + index * TRAFFIC.spawnSpacing + lane * 60;
        const desiredSpeed = 72 + ((index * 13 + lane * 7) % 32);
        return { id: `traffic-${lane}-${index}`, kind, x, previousX: x, y, direction: lane < 2 ? 1 : -1,
          speed: desiredSpeed, desiredSpeed, halfLength: kind === 'car' ? TRAFFIC.sedanHalfLength : TRAFFIC.scooterHalfLength,
          halfWidth: kind === 'car' ? TRAFFIC.sedanHalfWidth : TRAFFIC.scooterHalfWidth,
          color: [0xc5c9b0, 0x688f9b, 0xbd735f, 0x7c9386][(index + lane) % 4], yieldSeconds: 0 };
      }));
  }

  public getObstacles(): readonly CollisionObstacle[] {
    return this.vehicles.map((vehicle) => ({ ...trafficBody(vehicle), id: vehicle.id,
      label: vehicle.kind === 'car' ? '汽車' : '機車', velocityX: vehicle.speed * vehicle.direction, velocityY: 0 }));
  }

  public stopContacts(ids: readonly string[]): void {
    for (const vehicle of this.vehicles) if (ids.includes(vehicle.id)) {
      vehicle.speed = 0;
      vehicle.yieldSeconds = TRAFFIC.collisionYieldSeconds;
    }
  }

  public update(dt: number, player: CollisionBody): void {
    if (dt <= 0) return;
    this.elapsedSeconds += dt;
    // Plan all movements from the same snapshot so queue behavior is order-independent.
    const motions = this.vehicles.map((vehicle) => {
      let gap = Infinity;
      for (const other of this.vehicles) {
        if (other.id === vehicle.id || other.y !== vehicle.y) continue;
        const ahead = (other.x - vehicle.x) * vehicle.direction;
        if (ahead > 0) gap = Math.min(gap, ahead - vehicle.halfLength - other.halfLength - TRAFFIC.followingGap);
      }
      if (Math.abs(player.y - vehicle.y) < bodyYExtent(player) + vehicle.halfWidth + 5) {
        const ahead = (player.x - vehicle.x) * vehicle.direction;
        if (ahead > 0) gap = Math.min(gap, ahead - vehicle.halfLength - bodyXExtent(player) - TRAFFIC.followingGap);
      }
      for (const signal of TRAFFIC_SIGNALS) {
        if (signalColor(signal, this.elapsedSeconds) === 'green') continue;
        const line = signal.x - vehicle.direction * TRAFFIC.stopLineOffset;
        const front = vehicle.x + vehicle.direction * vehicle.halfLength;
        const distance = (line - front) * vehicle.direction;
        // Cars already past the line clear the crossing instead of reversing.
        if (distance >= 0) gap = Math.min(gap, distance);
      }
      const yieldSeconds = Math.max(0, vehicle.yieldSeconds - dt);
      const safeSpeed = Math.max(0, Math.min(
        Math.sqrt(2 * TRAFFIC.braking * Math.max(0, gap)),
        Math.max(0, gap) / TRAFFIC.reactionSeconds,
      ));
      const desired = yieldSeconds > 0 ? 0 : Math.min(vehicle.desiredSpeed, safeSpeed);
      const speed = vehicle.speed < desired ? Math.min(desired, vehicle.speed + TRAFFIC.acceleration * dt)
        : Math.max(desired, vehicle.speed - TRAFFIC.braking * dt);
      const travel = Math.max(0, Math.min(speed * dt, gap));
      return { x: vehicle.x + vehicle.direction * travel, speed: travel < speed * dt ? travel / dt : speed, yieldSeconds };
    });
    this.vehicles.forEach((vehicle, index) => {
      vehicle.previousX = vehicle.x;
      Object.assign(vehicle, motions[index]);
      // A stationary collection truck cannot be pushed by passing traffic.
      if (intersectBodies(trafficBody(vehicle), player)) {
        vehicle.x = vehicle.previousX;
        vehicle.speed = 0;
      }
    });
    for (const vehicle of this.vehicles) {
      if (vehicle.x >= -150 && vehicle.x <= WORLD.width + 150) continue;
      const spawnX = vehicle.direction > 0 ? -100 : WORLD.width + 100;
      const spawnBody = { ...trafficBody(vehicle), x: spawnX };
      const blocked = intersectBodies(spawnBody, player) || this.vehicles.some((other) => other.id !== vehicle.id && other.y === vehicle.y && Math.abs(other.x - spawnX) < vehicle.halfLength + other.halfLength + TRAFFIC.followingGap);
      if (!blocked) { vehicle.x = spawnX; vehicle.previousX = spawnX; vehicle.speed = 0; }
      else vehicle.speed = 0;
    }
  }

  public nextSignal(x: number): TrafficSignal | undefined {
    return TRAFFIC_SIGNALS.find((signal) => signal.x >= x - TRAFFIC.crossingWidth);
  }
}
