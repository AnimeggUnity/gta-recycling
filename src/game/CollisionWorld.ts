import { TRAFFIC } from '../config/balance';
import type { Vehicle } from './Vehicle';

export type CollisionBody = Readonly<{ x: number; y: number; rotation: number; halfLength: number; halfWidth: number }>;
export type CollisionObstacle = CollisionBody & Readonly<{ id: string; label: string; kind?: 'vehicle' | 'building'; velocityX?: number; velocityY?: number }>;
export type Contact = Readonly<{ normalX: number; normalY: number; depth: number }>;

/** Separating-axis test for rotated rectangles; normal points from B to A. */
export function intersectBodies(a: CollisionBody, b: CollisionBody): Contact | undefined {
  const axes = [
    { x: Math.cos(a.rotation), y: Math.sin(a.rotation) },
    { x: -Math.sin(a.rotation), y: Math.cos(a.rotation) },
    { x: Math.cos(b.rotation), y: Math.sin(b.rotation) },
    { x: -Math.sin(b.rotation), y: Math.cos(b.rotation) },
  ];
  let minimum = Infinity;
  let normal = axes[0];
  for (const axis of axes) {
    const radius = (body: CollisionBody) => body.halfLength * Math.abs(Math.cos(body.rotation) * axis.x + Math.sin(body.rotation) * axis.y)
      + body.halfWidth * Math.abs(-Math.sin(body.rotation) * axis.x + Math.cos(body.rotation) * axis.y);
    const separation = (a.x - b.x) * axis.x + (a.y - b.y) * axis.y;
    const overlap = radius(a) + radius(b) - Math.abs(separation);
    if (overlap <= 0) return undefined;
    if (overlap < minimum) {
      minimum = overlap;
      normal = { x: axis.x * (separation < 0 ? -1 : 1), y: axis.y * (separation < 0 ? -1 : 1) };
    }
  }
  return { normalX: normal.x, normalY: normal.y, depth: minimum };
}

export function truckBody(vehicle: Pick<Vehicle, 'x' | 'y' | 'rotation'>): CollisionBody {
  return {
    x: vehicle.x + Math.cos(vehicle.rotation) * TRAFFIC.truckCenterOffset,
    y: vehicle.y + Math.sin(vehicle.rotation) * TRAFFIC.truckCenterOffset,
    rotation: vehicle.rotation,
    halfLength: TRAFFIC.truckHalfLength,
    halfWidth: TRAFFIC.truckHalfWidth,
  };
}

export class CollisionWorld {
  public constructor(public readonly obstacles: readonly CollisionObstacle[]) {}

  public resolve(vehicle: Vehicle, moving: readonly CollisionObstacle[]): { impactSpeed: number; contacts: readonly string[]; label: string; fatalContact?: CollisionObstacle } {
    let impactSpeed = 0;
    let label = '';
    let fatalContact: CollisionObstacle | undefined;
    const contacts = new Set<string>();
    const candidates = [...this.obstacles, ...moving].filter((obstacle) => Math.abs(obstacle.x - vehicle.x) < obstacle.halfLength + obstacle.halfWidth + 160);
    for (let pass = 0; pass < TRAFFIC.collisionIterations; pass += 1) {
      let changed = false;
      for (const obstacle of candidates) {
        const contact = intersectBodies(truckBody(vehicle), obstacle);
        if (!contact) continue;
        changed = true;
        contacts.add(obstacle.id);
        if (!fatalContact && (obstacle.kind === 'vehicle' || obstacle.kind === 'building')) fatalContact = obstacle;
        const closing = -((vehicle.velocityX - (obstacle.velocityX ?? 0)) * contact.normalX + (vehicle.velocityY - (obstacle.velocityY ?? 0)) * contact.normalY);
        if (closing > impactSpeed) { impactSpeed = closing; label = obstacle.label; }
        vehicle.x += contact.normalX * (contact.depth + TRAFFIC.collisionSkin);
        vehicle.y += contact.normalY * (contact.depth + TRAFFIC.collisionSkin);
        const inward = vehicle.velocityX * contact.normalX + vehicle.velocityY * contact.normalY;
        if (inward < 0) {
          vehicle.velocityX -= inward * contact.normalX * (1 + TRAFFIC.restitution);
          vehicle.velocityY -= inward * contact.normalY * (1 + TRAFFIC.restitution);
        }
      }
      if (!changed) break;
    }
    if (contacts.size > 0) {
      const cos = Math.cos(vehicle.rotation), sin = Math.sin(vehicle.rotation);
      vehicle.telemetry = { ...vehicle.telemetry, speed: vehicle.speed,
        longitudinalSpeed: vehicle.velocityX * cos + vehicle.velocityY * sin,
        lateralSpeed: -vehicle.velocityX * sin + vehicle.velocityY * cos };
    }
    return { impactSpeed, contacts: [...contacts], label, fatalContact };
  }
}
